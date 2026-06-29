import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { resolveApiKey, detectProvider } from "@/app/lib/ai-client";

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

const SYSTEM_PROMPT = `You are a financial data extraction assistant. You will receive a PDF document. Extract all transactions or financial line items from it.

For each transaction, return:
- date: ISO format (YYYY-MM-DD). Infer year from context if missing.
- description: Clean description of the transaction/line item.
- counterparty: The other party (vendor, customer, etc.). Null if unclear.
- amount: Positive number (absolute value).
- currency: Currency code (default USD).
- sourceCategory: Any category visible in the document. Null if none.
- financialCategory: One of: revenue, cogs, payroll, software, marketing, rent, utilities, subscriptions, contractor, shipping, refunds, tax, debt, inventory, transfer, other
- type: income, expense, or transfer
- confidenceScore: 0.0 to 1.0
- notes: Any notable context. Null if nothing.

Rules:
- Credits/deposits = income, debits/charges = expense
- Skip totals, subtotals, headers, and non-transaction text
- For invoices: extract each line item as a transaction, or the total as one transaction
- If you cannot extract any transactions, return an empty transactions array`;

/**
 * Send a PDF to the AI provider for transaction extraction via vision.
 * OpenAI receives it as a file data URL; Anthropic receives it as base64 document.
 * Supports both OpenAI and Anthropic keys.
 */
export async function extractFromPdf(
    buffer: Buffer,
    documentCategory?: string,
    userApiKey?: string | null
): Promise<ExtractedTransaction[]> {
    const apiKey = await resolveApiKey(userApiKey);
    const provider = detectProvider(apiKey);
    const base64 = buffer.toString("base64");

    const contextHint = `

IMPORTANT CONTEXT FOR CLASSIFICATION:
The user categorized this as "${documentCategory || "other"}". Verify this yourself by reading the document.

Rules for determining income vs expense FROM THE USER'S PERSPECTIVE:
- Invoice FROM a vendor TO the user → EXPENSES
- Invoice FROM the user TO a customer → INCOME
- Bank statement → credits are income, debits are expenses
- Receipt → EXPENSES
- Payroll report → EXPENSES`;

    console.log(`[pdf] Sending PDF to ${provider} for extraction (${(buffer.length / 1024).toFixed(0)}KB, category: ${documentCategory ?? "none"})...`);
    const start = Date.now();

    let result: { object: { transactions: ExtractedTransaction[] } };

    if (provider === "anthropic") {
        const anthropic = createAnthropic({ apiKey });
        const model = anthropic("claude-sonnet-4-5");

        result = await generateObject({
            model,
            schema: TransactionSchema,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "file",
                            data: base64,
                            mimeType: "application/pdf",
                        },
                        {
                            type: "text",
                            text: `${SYSTEM_PROMPT}${contextHint}\n\nExtract all transactions from this financial document.`,
                        },
                    ],
                },
            ],
            temperature: 0.1,
        });
    } else {
        // OpenAI — use file data URL format
        const openai = createOpenAI({ apiKey });
        const model = openai("gpt-4o");
        const dataUrl = `data:application/pdf;base64,${base64}`;

        result = await generateObject({
            model,
            schema: TransactionSchema,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "file",
                            data: dataUrl,
                            mimeType: "application/pdf",
                        },
                        {
                            type: "text",
                            text: `${SYSTEM_PROMPT}${contextHint}\n\nExtract all transactions from this financial document.`,
                        },
                    ],
                },
            ],
            temperature: 0.1,
        });
    }

    console.log(`[pdf] Response received in ${((Date.now() - start) / 1000).toFixed(1)}s`);
    return result.object.transactions ?? [];
}
