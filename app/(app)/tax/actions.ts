"use server";

import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { redirect } from "next/navigation";

export type TaxCategory = {
    category: string;
    label: string;
    amount: number;
    transactionCount: number;
    transactions: { date: string; description: string; amount: number }[];
};

export type TaxSummary = {
    fiscalYear: string;
    totalRevenue: number;
    totalDeductible: number;
    taxableIncome: number;
    categories: TaxCategory[];
    taxPaid: number;
    availableFiscalYears: string[];
};

// Categories that are typically tax-deductible business expenses
const DEDUCTIBLE_CATEGORIES = [
    { key: "payroll", label: "Payroll & Salaries" },
    { key: "software", label: "Software & Tools" },
    { key: "marketing", label: "Marketing & Advertising" },
    { key: "rent", label: "Rent & Office Space" },
    { key: "utilities", label: "Utilities" },
    { key: "subscriptions", label: "Subscriptions" },
    { key: "contractor", label: "Contractor Fees" },
    { key: "training", label: "Training & Education" },
    { key: "shipping", label: "Shipping & Postage" },
    { key: "cogs", label: "Cost of Goods Sold" },
    { key: "inventory", label: "Inventory" },
    { key: "other", label: "Other Business Expenses" },
];

export async function getTaxSummary(fiscalYear?: string): Promise<TaxSummary> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Get business profile for fiscal year start
    const profile = await prisma.businessProfile.findUnique({ where: { userId: user.id } });
    const fyStartMonth = (profile?.fiscalYearStart ?? 1) - 1; // 0-indexed

    // Determine all available fiscal years from transactions
    const allTxns = await prisma.transaction.findMany({
        where: { userId: user.id },
        select: { date: true },
        orderBy: { date: "asc" },
    });

    const fySet = new Set<string>();
    for (const t of allTxns) {
        const d = t.date;
        // Fiscal year label: the calendar year in which the FY starts
        const fyYear = d.getMonth() >= fyStartMonth ? d.getFullYear() : d.getFullYear() - 1;
        fySet.add(String(fyYear));
    }
    const availableFiscalYears = Array.from(fySet).sort().reverse();

    // Default to most recent fiscal year
    const targetFY = fiscalYear ?? availableFiscalYears[0] ?? String(new Date().getFullYear());
    const fyStartYear = Number(targetFY);
    const fyStart = new Date(fyStartYear, fyStartMonth, 1);
    const fyEnd = new Date(fyStartYear + 1, fyStartMonth, 1);

    const transactions = await prisma.transaction.findMany({
        where: {
            userId: user.id,
            date: { gte: fyStart, lt: fyEnd },
        },
        orderBy: { date: "asc" },
    });

    const totalRevenue = transactions
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + Number(t.amount), 0);

    const taxPaid = transactions
        .filter((t) => t.type === "expense" && t.financialCategory === "tax")
        .reduce((s, t) => s + Number(t.amount), 0);

    // Build deductible categories
    const categories: TaxCategory[] = [];
    let totalDeductible = 0;

    for (const { key, label } of DEDUCTIBLE_CATEGORIES) {
        const matching = transactions.filter(
            (t) => t.type === "expense" && t.financialCategory === key
        );
        if (matching.length === 0) continue;
        const amount = matching.reduce((s, t) => s + Number(t.amount), 0);
        totalDeductible += amount;
        categories.push({
            category: key,
            label,
            amount,
            transactionCount: matching.length,
            transactions: matching.slice(0, 5).map((t) => ({
                date: t.date.toISOString().split("T")[0],
                description: t.description,
                amount: Number(t.amount),
            })),
        });
    }

    categories.sort((a, b) => b.amount - a.amount);

    const taxableIncome = totalRevenue - totalDeductible;

    return {
        fiscalYear: targetFY,
        totalRevenue,
        totalDeductible,
        taxableIncome,
        categories,
        taxPaid,
        availableFiscalYears,
    };
}
