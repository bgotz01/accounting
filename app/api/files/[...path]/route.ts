import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const LOCAL_UPLOADS_DIR = path.join(process.cwd(), ".uploads");

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path: segments } = await params;
    const filePath = path.join(LOCAL_UPLOADS_DIR, ...segments);

    // Security: ensure we're not escaping the uploads directory
    if (!filePath.startsWith(LOCAL_UPLOADS_DIR)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const buffer = await fs.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();

        const mimeTypes: Record<string, string> = {
            ".csv": "text/csv",
            ".xlsx":
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".xls": "application/vnd.ms-excel",
            ".pdf": "application/pdf",
        };

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": mimeTypes[ext] ?? "application/octet-stream",
                "Content-Disposition": `inline; filename="${segments[segments.length - 1]}"`,
            },
        });
    } catch {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
}
