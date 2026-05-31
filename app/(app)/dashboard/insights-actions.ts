"use server";

import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { redirect } from "next/navigation";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPEN_AI_API });

export type AiInsight = {
    id: string;
    type: string;
    title: string;
    content: string;
    severity: string;
    createdAt: string;
};

export async function getInsights(): Promise<AiInsight[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const insights = await prisma.aiInsight.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
    });

    return insights.map((i) => ({
        id: i.id,
        type: i.type,
        title: i.title,
        content: i.content,
        severity: i.severity,
        createdAt: i.createdAt.toISOString(),
    }));
}

export async function generateInsights(): Promise<{ insights: AiInsight[]; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const transactions = await prisma.transaction.findMany({
        where: { userId: user.id },
        orderBy: { date: "desc" },
    });

    if (transactions.length === 0) {
        return { insights: [], error: "No transaction data to analyse." };
    }

    const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

    // Monthly breakdown
    const monthMap = new Map<string, { income: number; expenses: number }>();
    for (const t of transactions) {
        const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
        if (!monthMap.has(key)) monthMap.set(key, { income: 0, expenses: 0 });
        const m = monthMap.get(key)!;
        if (t.type === "income") m.income += Number(t.amount);
        else m.expenses += Number(t.amount);
    }
    const monthly = [...monthMap.entries()].sort(([a], [b]) => a.localeCompare(b))
        .map(([period, d]) => ({ period, ...d, net: d.income - d.expenses }));

    // Category breakdown
    const catMap = new Map<string, number>();
    transactions.filter((t) => t.type === "expense").forEach((t) => {
        const cat = t.financialCategory ?? "other";
        catMap.set(cat, (catMap.get(cat) ?? 0) + Number(t.amount));
    });
    const categories = [...catMap.entries()].sort((a, b) => b[1] - a[1]);

    const profile = await prisma.businessProfile.findUnique({ where: { userId: user.id } });

    const prompt = `You are a financial analyst reviewing a small business's accounting data. Generate exactly 5 specific, actionable insights based on this data.

Business: ${profile?.businessName ?? "Unknown"} | Industry: ${profile?.industry ?? "Unknown"} | Currency: ${profile?.currency ?? "USD"}

Financial Summary:
- Total Revenue: ${totalIncome.toFixed(2)}
- Total Expenses: ${totalExpenses.toFixed(2)}
- Net Income: ${(totalIncome - totalExpenses).toFixed(2)}
- Profit Margin: ${totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : 0}%

Monthly Trends (chronological):
${JSON.stringify(monthly, null, 2)}

Expense Categories:
${categories.map(([cat, amt]) => `  ${cat}: ${amt.toFixed(2)}`).join("\n")}

Return a JSON array of exactly 5 insights. Each insight must have:
- type: one of "trend", "warning", "opportunity", "anomaly", "benchmark"
- title: short title (max 8 words)
- content: 1-2 sentence actionable insight
- severity: one of "info", "warning", "success"

Return ONLY valid JSON, no markdown, no explanation.`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
        });

        const raw = response.choices[0]?.message?.content ?? "[]";
        const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim()) as {
            type: string; title: string; content: string; severity: string;
        }[];

        // Delete old insights and save new ones
        await prisma.aiInsight.deleteMany({ where: { userId: user.id } });

        const created = await prisma.aiInsight.createManyAndReturn({
            data: parsed.map((ins) => ({
                userId: user.id,
                type: ins.type ?? "info",
                title: ins.title ?? "Insight",
                content: ins.content ?? "",
                severity: ins.severity ?? "info",
            })),
        });

        return {
            insights: created.map((i) => ({
                id: i.id,
                type: i.type,
                title: i.title,
                content: i.content,
                severity: i.severity,
                createdAt: i.createdAt.toISOString(),
            })),
        };
    } catch (err) {
        console.error("[generateInsights]", err);
        return { insights: [], error: "Failed to generate insights. Please try again." };
    }
}
