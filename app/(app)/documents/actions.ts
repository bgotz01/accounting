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

    // Only preview CSV and XLSX files as text
    if (file.fileType !== "csv" && file.fileType !== "xlsx") {
        return { error: "Preview only available for CSV and XLSX files", fileType: file.fileType };
    }

    const { data, error } = await downloadFromStorage(file.storagePath);

    if (error || !data) {
        return { error: "Failed to download file for preview" };
    }

    if (file.fileType === "csv") {
        const text = data.toString("utf-8");
        const lines = text.split("\n").slice(0, 50);
        return { content: lines.join("\n"), totalLines: text.split("\n").length, filename: file.filename };
    }

    // XLSX: parse and render as plain text table
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(data, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    const preview = rows.slice(0, 50).map((row) =>
        row.map((cell) => String(cell).padEnd(20)).join(" | ")
    );
    return { content: preview.join("\n"), totalLines: rows.length, filename: file.filename };
}
