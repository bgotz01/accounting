import { generateObject } from "ai";
import { z } from "zod";
import { getModel, resolveApiKey } from "@/app/lib/ai-client";
import type { RawRow } from "./parse-file";

export type ExtractedTransaction = {
    date: string;
    description: string;
    counterparty: string | null;
    amount: number;
    currency: string;
    sourceCategory: string | null;
    financialCategory: string;
    type: "income" | "expense" | "transfer";
    confidenceScore: number;
    notes: string | null;
};

const TransactionSchema = z.object({
    transactions: z.array(
        z.object({
            date: z.string(),
            description: z.string(),
            counterparty: z.string().nullable(),
            amount: z.number(),
            currency: z.string().default("USD"),
            sourceCategory: z.string().nullable(),
            financialCategory: z.string(),
            type: z.enum(["income", "expense", "transfer"]),
            confidenceScore: z.number().min(0).max(1),
            notes: z.string().nullable(),
        })
    ),
});

const SYSTEM_PROMPT = `You are a financial data extraction assistant. Your job is to take raw rows from a financial document (bank statement, invoice, receipt, etc.) and normalize them into structured transaction records.

For each row, extract:
- date: The transaction date in ISO format (YYYY-MM-DD). If the year is missing, assume the current year.
- description: A clean, concise description of the transaction.
- counterparty: The other party in the transaction (vendor, customer, bank, etc.). Null if unclear.
- amount: The transaction amount as a positive number. Use the absolute value.
- currency: The currency code (default USD if not specified).
- sourceCategory: The original category from the source data, preserved exactly as-is. Null if the source has no category column.
- financialCategory: One of these standardized categories: revenue, cogs, payroll, software, tax, rent, utilities, marketing, subscriptions, contractor, transfer, debt, inventory, shipping, refunds, other
- type: One of: income, expense, transfer
- confidenceScore: Your confidence in the categorization from 0.0 to 1.0
- notes: Any additional context or flags. Null if nothing notable.

Rules:
- Positive amounts or credits = income (financialCategory should be "revenue")
- Negative amounts or debits = expense (but store amount as positive)
- Transfers between accounts = transfer
- If a row is clearly not a transaction (totals, headers, empty), skip it
- Map source categories to the closest financialCategory`;

/**
 * Send raw rows to AI for transaction extraction.
 * Processes in batches to stay within token limits.
 * Supports both OpenAI and Anthropic keys.
 */
export async function extractTransactions(
    rows: RawRow[],
    headers: string[],
    userApiKey?: string | null
): Promise<ExtractedTransaction[]> {
    if (rows.length === 0) return [];

    const apiKey = await resolveApiKey(userApiKey);
    const model = getModel(apiKey, "standard");

    const BATCH_SIZE = 30;
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
    const allTransactions: ExtractedTransaction[] = [];

    console.log(`[extract] Starting extraction: ${rows.length} rows, ${totalBatches} batch(es)`);

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const batch = rows.slice(i, i + BATCH_SIZE);
        console.log(`[extract] Processing batch ${batchNum}/${totalBatches} (${batch.length} rows)...`);
        const start = Date.now();

        const userMessage = `${SYSTEM_PROMPT}

Here are the column headers: ${JSON.stringify(headers)}

Here are the rows to process:
${JSON.stringify(batch, null, 2)}

Extract and normalize these into transaction records.`;

        const { object } = await generateObject({
            model,
            schema: TransactionSchema,
            prompt: userMessage,
            temperature: 0.1,
        });

        console.log(`[extract] Batch ${batchNum} done in ${((Date.now() - start) / 1000).toFixed(1)}s — ${object.transactions.length} transactions`);
        allTransactions.push(...object.transactions);
    }

    console.log(`[extract] Complete: ${allTransactions.length} total transactions extracted`);
    return allTransactions;
}
