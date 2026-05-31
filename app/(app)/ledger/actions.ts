"use server";

import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { redirect } from "next/navigation";

export type LedgerEntry = {
    id: string;
    date: string;
    description: string;
    counterparty: string | null;
    debitAccount: string;
    creditAccount: string;
    amount: number;
    currency: string;
    filename: string | null;
};

export type AccountSummary = {
    account: string;
    totalDebits: number;
    totalCredits: number;
    balance: number;
    entryCount: number;
};

export async function getLedgerData(period?: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const where: any = { userId: user.id };

    // Filter by period (YYYY-MM)
    if (period) {
        const [year, month] = period.split("-").map(Number);
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 1);
        where.date = { gte: start, lt: end };
    }

    const transactions = await prisma.transaction.findMany({
        where,
        include: { file: { select: { filename: true } } },
        orderBy: { date: "asc" },
    });

    // Map each transaction to a double-entry ledger line.
    // Convention:
    //   income  → debit "cash", credit <financialCategory>
    //   expense → debit <financialCategory>, credit "cash"
    //   transfer → debit "transfer", credit "transfer"
    const entries: LedgerEntry[] = transactions.map((t) => {
        const category = t.financialCategory ?? "uncategorized";
        const type = t.type;

        let debitAccount: string;
        let creditAccount: string;

        if (type === "income") {
            debitAccount = "cash";
            creditAccount = category;
        } else if (type === "expense") {
            debitAccount = category;
            creditAccount = "cash";
        } else if (type === "transfer") {
            // If someone has re-categorized a transfer to a real category, treat it
            // as an expense so it shows up under the chosen account.
            if (category !== "transfer" && category !== "uncategorized") {
                debitAccount = category;
                creditAccount = "cash";
            } else {
                debitAccount = "transfer";
                creditAccount = "transfer";
            }
        } else {
            debitAccount = category;
            creditAccount = "cash";
        }

        return {
            id: t.id,
            date: t.date.toISOString().split("T")[0],
            description: t.description,
            counterparty: t.counterparty,
            debitAccount,
            creditAccount,
            amount: Number(t.amount),
            currency: t.currency,
            filename: t.file?.filename ?? null,
        };
    });

    // Build account summaries
    const accountMap = new Map<string, { debits: number; credits: number; count: number }>();

    for (const entry of entries) {
        // Debit side
        if (!accountMap.has(entry.debitAccount)) {
            accountMap.set(entry.debitAccount, { debits: 0, credits: 0, count: 0 });
        }
        const debitAcc = accountMap.get(entry.debitAccount)!;
        debitAcc.debits += entry.amount;
        debitAcc.count += 1;

        // Credit side
        if (entry.creditAccount !== entry.debitAccount) {
            if (!accountMap.has(entry.creditAccount)) {
                accountMap.set(entry.creditAccount, { debits: 0, credits: 0, count: 0 });
            }
            const creditAcc = accountMap.get(entry.creditAccount)!;
            creditAcc.credits += entry.amount;
            creditAcc.count += 1;
        }
    }

    const accounts: AccountSummary[] = Array.from(accountMap.entries())
        .map(([account, { debits, credits, count }]) => ({
            account,
            totalDebits: debits,
            totalCredits: credits,
            balance: debits - credits,
            entryCount: count,
        }))
        .sort((a, b) => {
            // Cash first, then by absolute balance descending
            if (a.account === "cash") return -1;
            if (b.account === "cash") return 1;
            return Math.abs(b.balance) - Math.abs(a.balance);
        });

    // Available periods from all transactions (for the period picker)
    const allTransactions = await prisma.transaction.findMany({
        where: { userId: user.id },
        select: { date: true },
        orderBy: { date: "asc" },
    });

    const periodSet = new Set<string>();
    for (const t of allTransactions) {
        const d = t.date;
        periodSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const periods = Array.from(periodSet).sort().reverse();

    return { entries, accounts, periods };
}
