"use server";

import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { redirect } from "next/navigation";

export type DashboardData = {
    totalIncome: number;
    totalExpenses: number;
    netCashFlow: number;
    expensesByCategory: { category: string; amount: number; pct: number }[];
    recentTransactions: {
        id: string;
        date: string;
        description: string;
        financialCategory: string | null;
        amount: number;
        type: string;
    }[];
    transactionCount: number;
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

    const totalIncome = transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const netCashFlow = totalIncome - totalExpenses;

    // Group expenses by financial category
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
            amount,
            pct: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

    // Recent transactions (last 8)
    const recentTransactions = transactions.slice(0, 8).map((t) => ({
        id: t.id,
        date: t.date.toISOString().split("T")[0],
        description: t.description,
        financialCategory: t.financialCategory,
        amount: Number(t.amount),
        type: t.type,
    }));

    return {
        totalIncome,
        totalExpenses,
        netCashFlow,
        expensesByCategory,
        recentTransactions,
        transactionCount: transactions.length,
    };
}
