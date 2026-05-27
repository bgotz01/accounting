"use server";

import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { redirect } from "next/navigation";

export async function getTransactions(fileId?: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const where: any = { userId: user.id };
    if (fileId) {
        where.fileId = fileId;
    }

    const transactions = await prisma.transaction.findMany({
        where,
        include: { file: { select: { filename: true } } },
        orderBy: { date: "desc" },
    });

    // Detect duplicates: same date + amount + description
    const seen = new Map<string, number>();
    const mapped = transactions.map((t) => {
        const key = `${t.date.toISOString().split("T")[0]}|${Number(t.amount)}|${t.description}`;
        seen.set(key, (seen.get(key) || 0) + 1);
        return {
            id: t.id,
            date: t.date.toISOString().split("T")[0],
            description: t.description,
            counterparty: t.counterparty,
            amount: Number(t.amount),
            currency: t.currency,
            sourceCategory: t.sourceCategory,
            financialCategory: t.financialCategory,
            type: t.type,
            confidenceScore: t.confidenceScore,
            filename: t.file?.filename ?? null,
            notes: t.notes,
            _key: key,
        };
    });

    // Mark duplicates
    return mapped.map(({ _key, ...t }) => ({
        ...t,
        isDuplicate: (seen.get(_key) || 0) > 1,
    }));
}

export async function updateTransactionCategory(
    transactionId: string,
    financialCategory: string
) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Not authenticated" };
    }

    await prisma.transaction.updateMany({
        where: { id: transactionId, userId: user.id },
        data: { financialCategory },
    });

    return { success: true };
}
