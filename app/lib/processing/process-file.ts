import { prisma } from "@/app/lib/prisma";
import { downloadFromStorage } from "@/app/lib/storage";
import { parseFile } from "./parse-file";
import { canDirectImport, directImport } from "./direct-import";
import { extractTransactions } from "./extract-transactions";
import { extractFromPdf } from "./parse-pdf";

/**
 * Full processing pipeline for an uploaded file:
 * 1. Download from storage
 * 2. Parse into raw rows
 * 3. Direct import if structured, otherwise GPT extraction
 * 4. Save transactions to database
 * 5. Update file status
 */
export async function processFile(fileId: string) {
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file) {
        throw new Error(`File not found: ${fileId}`);
    }

    await prisma.file.update({
        where: { id: fileId },
        data: { processingStatus: "processing" },
    });

    try {
        const { data: buffer, error: downloadError } =
            await downloadFromStorage(file.storagePath);

        if (downloadError || !buffer) {
            throw new Error(`Failed to download file: ${downloadError}`);
        }

        console.log(
            `[process] Parsing file: ${file.filename} (${file.fileType})`
        );

        // PDF processing path — send directly to GPT-4o vision
        if (file.fileType === "pdf") {
            const extracted = await extractFromPdf(buffer, file.category);

            if (extracted.length > 0) {
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
            }

            await prisma.file.update({
                where: { id: fileId },
                data: { processingStatus: "completed" },
            });

            console.log(`[process] PDF complete: ${extracted.length} transactions`);
            return { transactionCount: extracted.length };
        }

        // CSV/XLSX processing path
        const { rows, headers } = await parseFile(
            buffer.buffer as ArrayBuffer,
            file.fileType
        );
        console.log(
            `[process] Parsed ${rows.length} rows, ${headers.length} columns: [${headers.slice(0, 5).join(", ")}${headers.length > 5 ? "..." : ""}]`
        );

        if (rows.length === 0) {
            await prisma.file.update({
                where: { id: fileId },
                data: { processingStatus: "completed" },
            });
            return { transactionCount: 0 };
        }

        // Ads/marketing reports go to a separate table
        if (file.category === "ads_reports") {
            const { processAdsData } = await import("./process-ads");
            console.log(`[process] Ads report detected — importing to ad_spend table`);
            const result = await processAdsData(file.id, file.userId, rows, headers);
            await prisma.file.update({
                where: { id: fileId },
                data: { processingStatus: "completed" },
            });
            console.log(`[process] Ads import complete: ${result.recordCount} records`);
            return { transactionCount: result.recordCount };
        }

        // Try direct import first (fast path for structured CSVs)
        if (canDirectImport(headers)) {
            console.log(`[process] Structured file detected — using direct import (no AI)`);
            const imported = directImport(rows, headers, file.category);

            if (imported.length > 0) {
                const transactions = imported.map((t) => ({
                    userId: file.userId,
                    fileId: file.id,
                    date: new Date(t.date),
                    description: t.description,
                    counterparty: null,
                    amount: t.amount,
                    currency: "USD",
                    sourceCategory: t.sourceCategory,
                    financialCategory: t.financialCategory,
                    type: t.type,
                    confidenceScore: 1.0,
                    notes: null,
                }));

                await prisma.transaction.createMany({ data: transactions });

                await prisma.file.update({
                    where: { id: fileId },
                    data: { processingStatus: "completed" },
                });

                console.log(
                    `[process] Direct import complete: ${transactions.length} transactions`
                );
                return { transactionCount: transactions.length };
            }
        }

        // Fallback: GPT extraction for unstructured/ambiguous data
        console.log(`[process] Using AI extraction (${rows.length} rows)...`);
        const extracted = await extractTransactions(rows, headers);

        if (extracted.length === 0) {
            await prisma.file.update({
                where: { id: fileId },
                data: { processingStatus: "completed" },
            });
            return { transactionCount: 0 };
        }

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

        await prisma.file.update({
            where: { id: fileId },
            data: { processingStatus: "completed" },
        });

        console.log(
            `[process] AI extraction complete: ${transactions.length} transactions`
        );
        return { transactionCount: transactions.length };
    } catch (error) {
        console.error(`Processing failed for file ${fileId}:`, error);

        await prisma.file.update({
            where: { id: fileId },
            data: { processingStatus: "failed" },
        });

        throw error;
    }
}
