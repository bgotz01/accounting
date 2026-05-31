"use server";

import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type InvoiceRecord = {
    id: string;
    vendor: string;
    invoiceNumber: string | null;
    amount: number;
    currency: string;
    issueDate: string;
    dueDate: string | null;
    paidDate: string | null;
    status: string;
    category: string;
    notes: string | null;
    filename: string | null;
    isOverdue: boolean;
};

export async function getInvoices(): Promise<InvoiceRecord[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const invoices = await prisma.invoice.findMany({
        where: { userId: user.id },
        include: { file: { select: { filename: true } } },
        orderBy: { issueDate: "desc" },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return invoices.map((inv) => {
        const isOverdue =
            inv.status === "unpaid" &&
            inv.dueDate !== null &&
            new Date(inv.dueDate) < today;

        return {
            id: inv.id,
            vendor: inv.vendor,
            invoiceNumber: inv.invoiceNumber,
            amount: Number(inv.amount),
            currency: inv.currency,
            issueDate: inv.issueDate.toISOString().split("T")[0],
            dueDate: inv.dueDate?.toISOString().split("T")[0] ?? null,
            paidDate: inv.paidDate?.toISOString().split("T")[0] ?? null,
            status: isOverdue ? "overdue" : inv.status,
            category: inv.category,
            notes: inv.notes,
            filename: inv.file?.filename ?? null,
            isOverdue,
        };
    });
}

export async function createInvoice(_prevState: unknown, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const vendor = (formData.get("vendor") as string)?.trim();
    if (!vendor) return { error: "Vendor name is required." };

    const amountRaw = formData.get("amount") as string;
    const amount = parseFloat(amountRaw);
    if (isNaN(amount) || amount <= 0) return { error: "Valid amount is required." };

    const issueDateRaw = formData.get("issueDate") as string;
    if (!issueDateRaw) return { error: "Issue date is required." };

    const dueDateRaw = formData.get("dueDate") as string;
    const paidDateRaw = formData.get("paidDate") as string;

    try {
        await prisma.invoice.create({
            data: {
                userId: user.id,
                vendor,
                invoiceNumber: (formData.get("invoiceNumber") as string)?.trim() || null,
                amount,
                currency: (formData.get("currency") as string) || "USD",
                issueDate: new Date(issueDateRaw),
                dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
                paidDate: paidDateRaw ? new Date(paidDateRaw) : null,
                status: paidDateRaw ? "paid" : "unpaid",
                category: (formData.get("category") as string) || "other",
                notes: (formData.get("notes") as string)?.trim() || null,
            },
        });
        revalidatePath("/invoices");
        return { success: true };
    } catch (err) {
        console.error("[createInvoice]", err);
        return { error: "Failed to create invoice." };
    }
}

export async function updateInvoiceStatus(id: string, status: "paid" | "unpaid") {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    await prisma.invoice.updateMany({
        where: { id, userId: user.id },
        data: {
            status,
            paidDate: status === "paid" ? new Date() : null,
        },
    });
    revalidatePath("/invoices");
    return { success: true };
}

export async function deleteInvoice(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    await prisma.invoice.deleteMany({ where: { id, userId: user.id } });
    revalidatePath("/invoices");
    return { success: true };
}
