"use server";

import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { processFile } from "@/app/lib/processing/process-file";
import { redirect } from "next/navigation";

export async function processFileAction(fileId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Verify file belongs to user
    const file = await prisma.file.findFirst({
        where: { id: fileId, userId: user.id },
    });

    if (!file) {
        return { error: "File not found" };
    }

    if (file.processingStatus === "processing") {
        return { error: "File is already being processed" };
    }

    if (file.processingStatus === "completed") {
        return { error: "File has already been processed" };
    }

    try {
        const result = await processFile(fileId);
        return { success: `Extracted ${result.transactionCount} transactions.` };
    } catch (error) {
        return { error: "Processing failed. Please try again." };
    }
}
