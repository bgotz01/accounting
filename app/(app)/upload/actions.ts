"use server";

import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { uploadToStorage } from "@/app/lib/storage";
import { redirect } from "next/navigation";

const ALLOWED_TYPES = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/pdf",
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export type UploadState = {
    error?: string;
    success?: string;
    fileId?: string;
} | null;

export async function uploadFile(
    _prevState: UploadState,
    formData: FormData
): Promise<UploadState> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string;
    const period = (formData.get("period") as string) || null;

    if (!file || file.size === 0) {
        return { error: "Please select a file to upload." };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return {
            error: "File type not supported. Please upload CSV, XLSX, or PDF.",
        };
    }

    if (file.size > MAX_SIZE) {
        return { error: "File is too large. Maximum size is 10MB." };
    }

    // Check for duplicate filename
    const existing = await prisma.file.findFirst({
        where: { userId: user.id, filename: file.name },
    });

    if (existing) {
        return {
            error: `A file named "${file.name}" already exists. Delete it first or rename your file.`,
        };
    }

    // Generate a unique storage path
    const storagePath = `${user.id}/${category}/${Date.now()}-${file.name}`;

    // Upload to storage
    const { error: storageError } = await uploadToStorage(storagePath, file);

    if (storageError) {
        console.error("Storage upload error:", storageError);
        return { error: `Failed to upload file: ${storageError}` };
    }

    // Determine file type label
    let fileType = "other";
    if (file.type === "text/csv" || file.type === "application/vnd.ms-excel") {
        fileType = "csv";
    } else if (
        file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
        fileType = "xlsx";
    } else if (file.type === "application/pdf") {
        fileType = "pdf";
    }

    // Save file record to database
    const record = await prisma.file.create({
        data: {
            userId: user.id,
            filename: file.name,
            fileType,
            storagePath,
            category: category || "other",
            period: period || null,
            processingStatus: "pending",
        },
    });

    return {
        success: `"${file.name}" uploaded successfully.`,
        fileId: record.id,
    };
}

export async function getUserFiles() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return [];
    }

    const files = await prisma.file.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
    });

    return files;
}

export async function deleteFile(fileId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Not authenticated" };
    }

    // Verify file belongs to user
    const file = await prisma.file.findFirst({
        where: { id: fileId, userId: user.id },
    });

    if (!file) {
        return { error: "File not found" };
    }

    // Delete from storage
    const { deleteFromStorage } = await import("@/app/lib/storage");
    await deleteFromStorage(file.storagePath);

    // Delete associated transactions
    await prisma.transaction.deleteMany({ where: { fileId: file.id } });

    // Delete file record
    await prisma.file.delete({ where: { id: file.id } });

    return { success: true };
}
