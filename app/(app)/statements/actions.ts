"use server";

import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { redirect } from "next/navigation";

export type PeriodStatement = {
    period: string; // "2025-11" or "2025-W45"
    label: string; // "Nov 2025" or "Week 45, 2025"
    revenue: number;
    cogs: number;
    grossProfit: number;
    operatingExpenses: Record<string, number>;
    totalOperatingExpenses: number;
    otherExpenses: Record<string, number>;
    totalOtherExpenses: number;
    netIncome: number;
    transactionCount: number;
};

const OPERATING_EXPENSE_CATEGORIES = [
    "payroll",
    "software",
    "marketing",
    "rent",
    "utilities",
    "subscriptions",
    "contractor",
];

const COGS_CATEGORIES = ["cogs", "shipping", "inventory"];

const OTHER_EXPENSE_CATEGORIES = ["tax", "debt", "refunds", "transfer", "other"];

export async function getIncomeStatements(
    groupBy: "monthly" | "weekly" = "monthly"
): Promise<PeriodStatement[]> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const transactions = await prisma.transaction.findMany({
        where: { userId: user.id },
        orderBy: { date: "asc" },
    });

    if (transactions.length === 0) return [];

    // Group transactions by period
    const periods = new Map<string, typeof transactions>();

    for (const t of transactions) {
        const date = new Date(t.date);
        let key: string;

        if (groupBy === "monthly") {
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        } else {
            // Group by week ending Sunday
            const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
            const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
            const weekEnding = new Date(date);
            weekEnding.setDate(date.getDate() + daysUntilSunday);
            key = weekEnding.toISOString().split("T")[0]; // "2025-11-02"
        }

        if (!periods.has(key)) periods.set(key, []);
        periods.get(key)!.push(t);
    }

    // Build statements for each period
    const statements: PeriodStatement[] = [];

    for (const [period, txns] of periods) {
        let revenue = 0;
        let cogs = 0;
        const operatingExpenses: Record<string, number> = {};
        const otherExpenses: Record<string, number> = {};

        for (const t of txns) {
            const amount = Number(t.amount);
            const cat = t.financialCategory || "other";

            if (t.type === "income") {
                revenue += amount;
            } else if (COGS_CATEGORIES.includes(cat)) {
                cogs += amount;
            } else if (OPERATING_EXPENSE_CATEGORIES.includes(cat)) {
                operatingExpenses[cat] = (operatingExpenses[cat] || 0) + amount;
            } else {
                otherExpenses[cat] = (otherExpenses[cat] || 0) + amount;
            }
        }

        const totalOperatingExpenses = Object.values(operatingExpenses).reduce(
            (s, v) => s + v,
            0
        );
        const totalOtherExpenses = Object.values(otherExpenses).reduce(
            (s, v) => s + v,
            0
        );
        const grossProfit = revenue - cogs;
        const netIncome = grossProfit - totalOperatingExpenses - totalOtherExpenses;

        // Generate label
        let label: string;
        if (groupBy === "monthly") {
            const [year, month] = period.split("-");
            const date = new Date(Number(year), Number(month) - 1);
            label = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        } else {
            const weekEnd = new Date(period);
            label = weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        }

        statements.push({
            period,
            label,
            revenue,
            cogs,
            grossProfit,
            operatingExpenses,
            totalOperatingExpenses,
            otherExpenses,
            totalOtherExpenses,
            netIncome,
            transactionCount: txns.length,
        });
    }

    // Sort by period descending (newest first)
    statements.sort((a, b) => b.period.localeCompare(a.period));

    return statements;
}
