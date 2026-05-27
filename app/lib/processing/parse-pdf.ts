import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPEN_AI_API,
});

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

const SYSTEM_PROMPT = `You are a financial data extraction assistant. You will receive a PDF document as an image. Extract all transactions or financial line items from it.

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
- Return {"transactions": [...]} as valid JSON
- If you cannot extract any transactions, return {"transactions": []}`;

/**
 * Send a PDF to GPT-4o vision for transaction extraction.
 * Converts the PDF buffer to base64 and sends as an image.
 * Auto-detects document type if user category seems wrong.
 */
export async function extractFromPdf(buffer: Buffer, documentCategory?: string): Promise<ExtractedTransaction[]> {
    const base64 = buffer.toString("base64");
    const dataUrl = `data:application/pdf;base64,${base64}`;

    // Always include smart detection — don't blindly trust user category
    const contextHint = `

IMPORTANT CONTEXT FOR CLASSIFICATION:
The user categorized this as "${documentCategory || "other"}". However, you must verify this yourself by reading the document.

Rules for determining income vs expense FROM THE USER'S PERSPECTIVE:
- If this is an invoice FROM a vendor/supplier TO the user → all amounts are EXPENSES
- If this is an invoice FROM the user TO a customer → all amounts are INCOME  
- If this is a bank statement → credits are income, debits are expenses
- If this is a receipt → all amounts are EXPENSES
- If this is a payroll report → all amounts are EXPENSES (payroll)
- Look for clues: "Bill To", "Invoice To", "Amount Due", "Payment Received", company letterhead

The user is the RECIPIENT of this document unless it clearly shows they issued it.`;

    console.log(`[pdf] Sending PDF to GPT-4o for extraction (${(buffer.length / 1024).toFixed(0)}KB, category: ${documentCategory ?? "none"})...`);
    const start = Date.now();

    const response = await openai.chat.completions.create(
        {
            model: "gpt-4o",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                {
                    role: "user",
                    content: [
                        {
                            type: "file",
                            file: {
                                filename: "document.pdf",
                                file_data: dataUrl,
                            },
                        },
                        {
                            type: "text",
                            text: `Extract all transactions from this financial document.${contextHint}`,
                        },
                    ],
                },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
        },
        { timeout: 120000 }
    );

    console.log(`[pdf] GPT response received in ${((Date.now() - start) / 1000).toFixed(1)}s`);

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    try {
        const parsed = JSON.parse(content);
        return parsed.transactions ?? [];
    } catch (e) {
        console.error("[pdf] Failed to parse GPT response:", e);
        return [];
    }
}
