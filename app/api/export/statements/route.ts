import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { redirect } from "next/navigation";

const COGS_CATEGORIES = ["cogs", "shipping", "inventory"];
const OPERATING_EXPENSE_CATEGORIES = ["payroll", "software", "marketing", "rent", "utilities", "subscriptions", "contractor"];

export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const transactions = await prisma.transaction.findMany({
        where: { userId: user.id },
        orderBy: { date: "asc" },
    });

    // Group by month
    const monthMap = new Map<string, { revenue: number; cogs: number; opex: Record<string, number>; other: Record<string, number> }>();
    for (const t of transactions) {
        const d = t.date;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!monthMap.has(key)) monthMap.set(key, { revenue: 0, cogs: 0, opex: {}, other: {} });
        const m = monthMap.get(key)!;
        const amt = Number(t.amount);
        const cat = t.financialCategory ?? "other";
        if (t.type === "income") m.revenue += amt;
        else if (COGS_CATEGORIES.includes(cat)) m.cogs += amt;
        else if (OPERATING_EXPENSE_CATEGORIES.includes(cat)) m.opex[cat] = (m.opex[cat] ?? 0) + amt;
        else m.other[cat] = (m.other[cat] ?? 0) + amt;
    }

    const rows: Record<string, string | number>[] = [];
    for (const [period, m] of [...monthMap.entries()].sort()) {
        const [year, month] = period.split("-");
        const label = new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
        const totalOpex = Object.values(m.opex).reduce((s, v) => s + v, 0);
        const totalOther = Object.values(m.other).reduce((s, v) => s + v, 0);
        const grossProfit = m.revenue - m.cogs;
        const netIncome = grossProfit - totalOpex - totalOther;
        rows.push({
            period: label,
            revenue: m.revenue,
            cogs: m.cogs,
            gross_profit: grossProfit,
            ...Object.fromEntries(Object.entries(m.opex).map(([k, v]) => [`opex_${k}`, v])),
            total_operating_expenses: totalOpex,
            ...Object.fromEntries(Object.entries(m.other).map(([k, v]) => [`other_${k}`, v])),
            net_income: netIncome,
        });
    }

    const allKeys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    const escape = (v: string | number) => {
        const s = String(v ?? "");
        return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"`
            : s;
    };
    const csv = [
        allKeys.join(","),
        ...rows.map((r) => allKeys.map((k) => escape(r[k] ?? 0)).join(",")),
    ].join("\n");

    return new Response(csv, {
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="income-statements-${new Date().toISOString().split("T")[0]}.csv"`,
        },
    });
}
