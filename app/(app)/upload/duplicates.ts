"use server";

import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";

export type DuplicateGroup = {
    date: string;
    amount: string;
    description: string;
    count: number;
    transactions: {
        id: string;
        fileId: string | null;
        filename: string | null;
        description: string;
        financialCategory: string | null;
        createdAt: Date;
    }[];
};

export async function checkDuplicates(): Promise<DuplicateGroup[]> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Return empty array instead of redirecting — caller handles unauthenticated state
    if (!user) return [];

    // Find transactions with same date + amount + description for this user
    const duplicates = await prisma.$queryRaw<
        { date: Date; amount: string; description: string; cnt: bigint }[]
    >`
    SELECT date, amount::text, description, count(*) as cnt
    FROM transactions
    WHERE user_id = ${user.id}
    GROUP BY date, amount, description
    HAVING count(*) > 1
    ORDER BY date DESC
  `;

    if (duplicates.length === 0) return [];

    // For each duplicate group, fetch the individual transactions
    const groups: DuplicateGroup[] = [];

    for (const dup of duplicates) {
        const transactions = await prisma.transaction.findMany({
            where: {
                userId: user.id,
                date: dup.date,
                // Cast the raw string to a number so Prisma's Decimal filter works
                amount: parseFloat(dup.amount),
                description: dup.description,
            },
            include: {
                file: { select: { filename: true } },
            },
            orderBy: { createdAt: "asc" },
        });

        groups.push({
            date: dup.date.toISOString().split("T")[0],
            amount: dup.amount,
            description: dup.description,
            count: Number(dup.cnt),
            transactions: transactions.map((t) => ({
                id: t.id,
                fileId: t.fileId,
                filename: t.file?.filename ?? null,
                description: t.description,
                financialCategory: t.financialCategory,
                createdAt: t.createdAt,
            })),
        });
    }

    return groups;
}

export async function deleteDuplicateTransactions(transactionIds: string[]) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Not authenticated" };
    }

    // Only delete transactions belonging to this user
    await prisma.transaction.deleteMany({
        where: {
            id: { in: transactionIds },
            userId: user.id,
        },
    });

    return { success: true, deleted: transactionIds.length };
}
