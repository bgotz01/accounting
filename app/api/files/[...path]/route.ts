import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";

const LOCAL_UPLOADS_DIR = path.join(process.cwd(), ".uploads");

const MIME_TYPES: Record<string, string> = {
    ".csv": "text/csv",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls": "application/vnd.ms-excel",
    ".pdf": "application/pdf",
};

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { path: segments } = await params;
    const storagePath = segments.join("/");
    const filePath = path.join(LOCAL_UPLOADS_DIR, storagePath);

    // Security: ensure we're not escaping the uploads directory
    if (!filePath.startsWith(LOCAL_UPLOADS_DIR)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Ownership check — the file must belong to this user
    const fileRecord = await prisma.file.findFirst({
        where: { userId: user.id, storagePath },
    });
    if (!fileRecord) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
        const buffer = await fs.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

        // Use RFC 5987 encoding for filenames that contain non-ASCII characters
        // (e.g. Arabic, CJK) so browsers handle them correctly.
        const encodedFilename = encodeURIComponent(fileRecord.filename);
        const contentDisposition = `inline; filename*=UTF-8''${encodedFilename}`;

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": contentDisposition,
                "Cache-Control": "private, max-age=300",
            },
        });
    } catch {
        return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
    }
}
