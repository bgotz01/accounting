import { createAdminClient } from "@/app/lib/supabase/admin";
import { promises as fs } from "node:fs";
import path from "node:path";

const USE_LOCAL_STORAGE = process.env.NODE_ENV === "development";
const LOCAL_UPLOADS_DIR = path.join(process.cwd(), ".uploads");

/**
 * Upload a file — uses local disk in dev, Supabase Storage in production.
 */
export async function uploadToStorage(
    storagePath: string,
    file: File
): Promise<{ error: string | null }> {
    if (USE_LOCAL_STORAGE) {
        try {
            const fullPath = path.join(LOCAL_UPLOADS_DIR, storagePath);
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            const buffer = Buffer.from(await file.arrayBuffer());
            await fs.writeFile(fullPath, buffer);
            return { error: null };
        } catch (e: any) {
            return { error: e.message };
        }
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient.storage
        .from("uploads")
        .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
        });

    return { error: error?.message ?? null };
}

/**
 * Download a file as a Buffer.
 */
export async function downloadFromStorage(
    storagePath: string
): Promise<{ data: Buffer | null; error: string | null }> {
    if (USE_LOCAL_STORAGE) {
        try {
            const fullPath = path.join(LOCAL_UPLOADS_DIR, storagePath);
            const buffer = await fs.readFile(fullPath);
            return { data: buffer, error: null };
        } catch (e: any) {
            return { data: null, error: e.message };
        }
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient.storage
        .from("uploads")
        .download(storagePath);

    if (error || !data) {
        return { data: null, error: error?.message ?? "Download failed" };
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    return { data: buffer, error: null };
}

/**
 * Get a signed download URL (or local file URL in dev).
 */
export async function getSignedUrl(
    storagePath: string
): Promise<{ url: string | null; error: string | null }> {
    if (USE_LOCAL_STORAGE) {
        // Serve via an API route in dev.
        // Encode each segment individually so slashes are preserved as path separators,
        // while spaces, Arabic characters, and other non-ASCII are percent-encoded.
        const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
        return { url: `/api/files/${encodedPath}`, error: null };
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient.storage
        .from("uploads")
        .createSignedUrl(storagePath, 3600);

    return { url: data?.signedUrl ?? null, error: error?.message ?? null };
}

/**
 * Delete a file from storage.
 */
export async function deleteFromStorage(
    storagePath: string
): Promise<{ error: string | null }> {
    if (USE_LOCAL_STORAGE) {
        try {
            const fullPath = path.join(LOCAL_UPLOADS_DIR, storagePath);
            await fs.unlink(fullPath);
            return { error: null };
        } catch (e: any) {
            return { error: e.message };
        }
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient.storage
        .from("uploads")
        .remove([storagePath]);

    return { error: error?.message ?? null };
}
