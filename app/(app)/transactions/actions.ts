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

    return transactions.map((t) => ({
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
