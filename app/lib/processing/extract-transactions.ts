import OpenAI from "openai";
import type { RawRow } from "./parse-file";

const openai = new OpenAI({
    apiKey: process.env.OPEN_AI_API,
});

export type ExtractedTransaction = {
    date: string; // ISO date string
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

const SYSTEM_PROMPT = `You are a financial data extraction assistant. Your job is to take raw rows from a financial document (bank statement, invoice, receipt, etc.) and normalize them into structured transaction records.

For each row, extract:
- date: The transaction date in ISO format (YYYY-MM-DD). If the year is missing, assume the current year.
- description: A clean, concise description of the transaction.
- counterparty: The other party in the transaction (vendor, customer, bank, etc.). Null if unclear.
- amount: The transaction amount as a positive number. Use the absolute value.
- currency: The currency code (default USD if not specified).
- sourceCategory: The original category from the source data, preserved exactly as-is. Null if the source has no category column.
- financialCategory: One of these standardized categories for financial statements: revenue, cogs, payroll, software, tax, rent, utilities, marketing, subscriptions, contractor, transfer, debt, inventory, shipping, refunds, other
- type: One of: income, expense, transfer
- confidenceScore: Your confidence in the categorization from 0.0 to 1.0
- notes: Any additional context or flags (e.g., "recurring", "unusual amount"). Null if nothing notable.

Rules:
- Positive amounts or credits = income (financialCategory should be "revenue")
- Negative amounts or debits = expense (but store amount as positive)
- Transfers between accounts = transfer
- If a row is clearly not a transaction (totals, headers, empty), skip it
- Map source categories to the closest financialCategory (e.g., "Advertising" → "marketing", "Warehouse" → "rent", "Software" → "software")
- Always return valid JSON`;

/**
 * Send raw rows to GPT for transaction extraction.
 * Processes in batches to stay within token limits.
 */
export async function extractTransactions(
    rows: RawRow[],
    headers: string[]
): Promise<ExtractedTransaction[]> {
    if (rows.length === 0) return [];

    const BATCH_SIZE = 30;
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
    const allTransactions: ExtractedTransaction[] = [];

    console.log(`[extract] Starting extraction: ${rows.length} rows, ${totalBatches} batch(es)`);

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const batch = rows.slice(i, i + BATCH_SIZE);
        console.log(`[extract] Processing batch ${batchNum}/${totalBatches} (${batch.length} rows)...`);
        const start = Date.now();
        const batchTransactions = await processBatch(batch, headers);
        console.log(`[extract] Batch ${batchNum} done in ${((Date.now() - start) / 1000).toFixed(1)}s — ${batchTransactions.length} transactions`);
        allTransactions.push(...batchTransactions);
    }

    console.log(`[extract] Complete: ${allTransactions.length} total transactions extracted`);
    return allTransactions;
}

async function processBatch(
    rows: RawRow[],
    headers: string[]
): Promise<ExtractedTransaction[]> {
    const userMessage = `Here are the column headers: ${JSON.stringify(headers)}

Here are the rows to process:
${JSON.stringify(rows, null, 2)}

Extract and normalize these into transaction records. Return a JSON array of transaction objects.`;

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
    }, { timeout: 60000 });

    const content = response.choices[0]?.message?.content;
    if (!content) {
        console.error("Empty response from OpenAI");
        return [];
    }

    try {
        const parsed = JSON.parse(content);
        // The response might be { transactions: [...] } or just [...]
        const transactions: ExtractedTransaction[] = Array.isArray(parsed)
            ? parsed
            : parsed.transactions ?? [];
        return transactions;
    } catch (e) {
        console.error("Failed to parse OpenAI response:", e);
        return [];
    }
}
