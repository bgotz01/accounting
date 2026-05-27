"use server";

import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { getSignedUrl, downloadFromStorage } from "@/app/lib/storage";
import { redirect } from "next/navigation";

export async function getAllFiles() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const files = await prisma.file.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
    });

    return files;
}

export async function getFileDownloadUrl(fileId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Not authenticated" };
    }

    const file = await prisma.file.findFirst({
        where: { id: fileId, userId: user.id },
    });

    if (!file) {
        return { error: "File not found" };
    }

    const { url, error } = await getSignedUrl(file.storagePath);

    if (error || !url) {
        return { error: "Failed to generate download link" };
    }

    return { url, filename: file.filename };
}

export async function getFilePreviewContent(fileId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Not authenticated" };
    }

    const file = await prisma.file.findFirst({
        where: { id: fileId, userId: user.id },
    });

    if (!file) {
        return { error: "File not found" };
    }

    // Only preview CSV files as text
    if (file.fileType !== "csv") {
        return { error: "Preview only available for CSV files", fileType: file.fileType };
    }

    const { data, error } = await downloadFromStorage(file.storagePath);

    if (error || !data) {
        return { error: "Failed to download file for preview" };
    }

    const text = data.toString("utf-8");
    const lines = text.split("\n").slice(0, 50);
    return { content: lines.join("\n"), totalLines: text.split("\n").length, filename: file.filename };
}
