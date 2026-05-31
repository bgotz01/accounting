import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "csv";

    const transactions = await prisma.transaction.findMany({
        where: { userId: user.id },
        include: { file: { select: { filename: true } } },
        orderBy: { date: "desc" },
    });

    const rows = transactions.map((t) => ({
        date: t.date.toISOString().split("T")[0],
        description: t.description,
        counterparty: t.counterparty ?? "",
        amount: Number(t.amount),
        currency: t.currency,
        type: t.type,
        financial_category: t.financialCategory ?? "",
        source_category: t.sourceCategory ?? "",
        source_file: t.file?.filename ?? "",
        notes: t.notes ?? "",
    }));

    if (format === "csv") {
        const headers = Object.keys(rows[0] ?? {});
        const escape = (v: string | number) => {
            const s = String(v);
            return s.includes(",") || s.includes('"') || s.includes("\n")
                ? `"${s.replace(/"/g, '""')}"`
                : s;
        };
        const csv = [
            headers.join(","),
            ...rows.map((r) => Object.values(r).map(escape).join(",")),
        ].join("\n");

        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="transactions-${new Date().toISOString().split("T")[0]}.csv"`,
            },
        });
    }

    // JSON fallback
    return Response.json(rows);
}
