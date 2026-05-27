import { prisma } from "@/app/lib/prisma";
import { downloadFromStorage } from "@/app/lib/storage";
import { parseFile } from "./parse-file";
import { extractTransactions } from "./extract-transactions";

/**
 * Full processing pipeline for an uploaded file:
 * 1. Download from storage
 * 2. Parse into raw rows
 * 3. Send to GPT for extraction
 * 4. Save transactions to database
 * 5. Update file status
 */
export async function processFile(fileId: string) {
    // Get file record
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file) {
        throw new Error(`File not found: ${fileId}`);
    }

    // Update status to processing
    await prisma.file.update({
        where: { id: fileId },
        data: { processingStatus: "processing" },
    });

    try {
        // Download file from storage
        const { data: buffer, error: downloadError } = await downloadFromStorage(file.storagePath);

        if (downloadError || !buffer) {
            throw new Error(`Failed to download file: ${downloadError}`);
        }

        // Parse the file
        console.log(`[process] Parsing file: ${file.filename} (${file.fileType})`);
        const { rows, headers } = await parseFile(buffer.buffer as ArrayBuffer, file.fileType);
        console.log(`[process] Parsed ${rows.length} rows, ${headers.length} columns: [${headers.slice(0, 5).join(", ")}${headers.length > 5 ? "..." : ""}]`);

        if (rows.length === 0) {
            await prisma.file.update({
                where: { id: fileId },
                data: { processingStatus: "completed" },
            });
            return { transactionCount: 0 };
        }

        // Extract transactions via AI
        const extracted = await extractTransactions(rows, headers);

        if (extracted.length === 0) {
            await prisma.file.update({
                where: { id: fileId },
                data: { processingStatus: "completed" },
            });
            return { transactionCount: 0 };
        }

        // Save transactions to database
        const transactions = extracted.map((t) => ({
            userId: file.userId,
            fileId: file.id,
            date: new Date(t.date),
            description: t.description,
            counterparty: t.counterparty,
            amount: t.amount,
            currency: t.currency || "USD",
            sourceCategory: t.sourceCategory,
            financialCategory: t.financialCategory,
            type: t.type,
            confidenceScore: t.confidenceScore,
            notes: t.notes,
        }));

        await prisma.transaction.createMany({ data: transactions });

        // Update file status to completed
        await prisma.file.update({
            where: { id: fileId },
            data: { processingStatus: "completed" },
        });

        return { transactionCount: transactions.length };
    } catch (error) {
        console.error(`Processing failed for file ${fileId}:`, error);

        // Update status to failed
        await prisma.file.update({
            where: { id: fileId },
            data: { processingStatus: "failed" },
        });

        throw error;
    }
}
