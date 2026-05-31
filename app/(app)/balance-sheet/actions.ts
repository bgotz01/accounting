"use server";

import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { redirect } from "next/navigation";

// Account classification for balance sheet
const ASSET_ACCOUNTS = ["cash", "inventory", "other"];
const LIABILITY_ACCOUNTS = ["debt", "tax"];
const EQUITY_ACCOUNTS = ["revenue", "cogs", "payroll", "software", "marketing", "rent", "utilities", "subscriptions", "contractor", "shipping", "refunds", "transfer", "training"];

export type BalanceSheetData = {
    asOf: string;
    period: string | null;
    assets: { account: string; label: string; balance: number }[];
    totalAssets: number;
    liabilities: { account: string; label: string; balance: number }[];
    totalLiabilities: number;
    equity: number; // retained earnings = net income
    totalLiabilitiesAndEquity: number;
    periods: string[];
};

const ACCOUNT_LABELS: Record<string, string> = {
    cash: "Cash & Bank",
    inventory: "Inventory",
    other: "Other Assets",
    debt: "Loans & Debt",
    tax: "Tax Payable",
};

function accountLabel(account: string) {
    return ACCOUNT_LABELS[account] ?? account.charAt(0).toUpperCase() + account.slice(1);
}

export async function getBalanceSheet(period?: string): Promise<BalanceSheetData> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Get all transactions up to end of selected period (cumulative)
    const where: Record<string, unknown> = { userId: user.id };
    if (period) {
        const [year, month] = period.split("-").map(Number);
        const end = new Date(year, month, 1); // first day of next month
        where.date = { lt: end };
    }

    const transactions = await prisma.transaction.findMany({
        where,
        orderBy: { date: "asc" },
    });

    // Build account balances using double-entry logic
    const accountMap = new Map<string, number>();
    const add = (acc: string, amt: number) => accountMap.set(acc, (accountMap.get(acc) ?? 0) + amt);

    for (const t of transactions) {
        const cat = t.financialCategory ?? "other";
        const amt = Number(t.amount);
        if (t.type === "income") {
            add("cash", amt);
            add(cat, amt); // credit revenue
        } else if (t.type === "expense") {
            add(cat, amt);  // debit expense
            add("cash", -amt); // credit cash
        }
    }

    // Assets: cash balance + inventory
    const assets = ASSET_ACCOUNTS
        .map((acc) => ({ account: acc, label: accountLabel(acc), balance: Math.max(0, accountMap.get(acc) ?? 0) }))
        .filter((a) => a.balance > 0);

    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);

    // Liabilities: debt + tax owed
    const liabilities = LIABILITY_ACCOUNTS
        .map((acc) => ({ account: acc, label: accountLabel(acc), balance: Math.max(0, accountMap.get(acc) ?? 0) }))
        .filter((l) => l.balance > 0);

    const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);

    // Equity = total assets - total liabilities (retained earnings proxy)
    const equity = totalAssets - totalLiabilities;

    // Available periods
    const allTxns = await prisma.transaction.findMany({
        where: { userId: user.id },
        select: { date: true },
        orderBy: { date: "asc" },
    });
    const periodSet = new Set<string>();
    for (const t of allTxns) {
        periodSet.add(`${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`);
    }
    const periods = Array.from(periodSet).sort().reverse();

    const asOf = period
        ? (() => {
            const [y, m] = period.split("-").map(Number);
            return new Date(y, m, 0).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        })()
        : new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    return {
        asOf,
        period: period ?? null,
        assets,
        totalAssets,
        liabilities,
        totalLiabilities,
        equity,
        totalLiabilitiesAndEquity: totalLiabilities + equity,
        periods,
    };
}
