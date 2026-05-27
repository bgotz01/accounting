"use server";

import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { redirect } from "next/navigation";

export type MonthlyTrend = {
    month: string; // "Nov 2025"
    income: number;
    expenses: number;
    net: number;
};

export type TopExpense = {
    description: string;
    financialCategory: string;
    totalAmount: number;
    occurrences: number;
    isRecurring: boolean;
};

export type DashboardData = {
    // Summary
    totalIncome: number;
    totalExpenses: number;
    netCashFlow: number;
    profitMargin: number; // percentage
    transactionCount: number;

    // Month-over-month
    currentMonthIncome: number;
    currentMonthExpenses: number;
    prevMonthIncome: number;
    prevMonthExpenses: number;
    incomeChange: number | null; // percentage change
    expenseChange: number | null;

    // Trends (last 6 months)
    monthlyTrends: MonthlyTrend[];

    // Expense breakdown
    expensesByCategory: { category: string; amount: number; pct: number }[];

    // Top recurring expenses
    topExpenses: TopExpense[];

    // Recent transactions
    recentTransactions: {
        id: string;
        date: string;
        description: string;
        financialCategory: string | null;
        amount: number;
        type: string;
    }[];
};

export async function getDashboardData(): Promise<DashboardData> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const transactions = await prisma.transaction.findMany({
        where: { userId: user.id },
        orderBy: { date: "desc" },
    });

    // Overall totals
    const totalIncome = transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const netCashFlow = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? Math.round((netCashFlow / totalIncome) * 100) : 0;

    // Group by month
    const monthMap = new Map<string, { income: number; expenses: number }>();
    for (const t of transactions) {
        const date = new Date(t.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (!monthMap.has(key)) monthMap.set(key, { income: 0, expenses: 0 });
        const entry = monthMap.get(key)!;
        if (t.type === "income") entry.income += Number(t.amount);
        else entry.expenses += Number(t.amount);
    }

    // Sort months chronologically
    const sortedMonths = [...monthMap.entries()].sort(([a], [b]) => a.localeCompare(b));

    // Monthly trends (all available months)
    const monthlyTrends: MonthlyTrend[] = sortedMonths.map(([key, data]) => {
        const [year, month] = key.split("-");
        const date = new Date(Number(year), Number(month) - 1);
        return {
            month: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
            income: Math.round(data.income),
            expenses: Math.round(data.expenses),
            net: Math.round(data.income - data.expenses),
        };
    });

    // Current vs previous month comparison
    const currentMonth = sortedMonths[sortedMonths.length - 1];
    const prevMonth = sortedMonths[sortedMonths.length - 2];

    const currentMonthIncome = currentMonth?.[1].income ?? 0;
    const currentMonthExpenses = currentMonth?.[1].expenses ?? 0;
    const prevMonthIncome = prevMonth?.[1].income ?? 0;
    const prevMonthExpenses = prevMonth?.[1].expenses ?? 0;

    const incomeChange =
        prevMonthIncome > 0
            ? Math.round(((currentMonthIncome - prevMonthIncome) / prevMonthIncome) * 100)
            : null;
    const expenseChange =
        prevMonthExpenses > 0
            ? Math.round(((currentMonthExpenses - prevMonthExpenses) / prevMonthExpenses) * 100)
            : null;

    // Expenses by category
    const expenseMap = new Map<string, number>();
    transactions
        .filter((t) => t.type === "expense")
        .forEach((t) => {
            const cat = t.financialCategory || "other";
            expenseMap.set(cat, (expenseMap.get(cat) || 0) + Number(t.amount));
        });

    const expensesByCategory = [...expenseMap.entries()]
        .map(([category, amount]) => ({
            category,
            amount: Math.round(amount),
            pct: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

    // Top expenses (group by description, find recurring ones)
    const expenseByDesc = new Map<string, { amount: number; count: number; category: string; months: Set<string> }>();
    transactions
        .filter((t) => t.type === "expense")
        .forEach((t) => {
            const key = t.description;
            const monthKey = new Date(t.date).toISOString().slice(0, 7);
            if (!expenseByDesc.has(key)) {
                expenseByDesc.set(key, { amount: 0, count: 0, category: t.financialCategory || "other", months: new Set() });
            }
            const entry = expenseByDesc.get(key)!;
            entry.amount += Number(t.amount);
            entry.count += 1;
            entry.months.add(monthKey);
        });

    const topExpenses: TopExpense[] = [...expenseByDesc.entries()]
        .map(([description, data]) => ({
            description,
            financialCategory: data.category,
            totalAmount: Math.round(data.amount),
            occurrences: data.count,
            isRecurring: data.months.size >= 2, // appears in 2+ months
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 8);

    // Recent transactions
    const recentTransactions = transactions.slice(0, 8).map((t) => ({
        id: t.id,
        date: t.date.toISOString().split("T")[0],
        description: t.description,
        financialCategory: t.financialCategory,
        amount: Number(t.amount),
        type: t.type,
    }));

    return {
        totalIncome: Math.round(totalIncome),
        totalExpenses: Math.round(totalExpenses),
        netCashFlow: Math.round(netCashFlow),
        profitMargin,
        transactionCount: transactions.length,
        currentMonthIncome: Math.round(currentMonthIncome),
        currentMonthExpenses: Math.round(currentMonthExpenses),
        prevMonthIncome: Math.round(prevMonthIncome),
        prevMonthExpenses: Math.round(prevMonthExpenses),
        incomeChange,
        expenseChange,
        monthlyTrends,
        expensesByCategory,
        topExpenses,
        recentTransactions,
    };
}
