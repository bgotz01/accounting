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

const SYSTEM_PROMPT = `You are a financial data extraction assistant. You will receive raw text extracted from a PDF financial document (bank statement, invoice, receipt, etc.).

Your job is to identify and extract all transactions from the text and return them as structured JSON.

For each transaction, extract:
- date: ISO format (YYYY-MM-DD). If year is missing, infer from context or use the most recent year mentioned.
- description: Clean, concise description.
- counterparty: The other party (vendor, customer, etc.). Null if unclear.
- amount: Positive number (absolute value).
- currency: Currency code (default USD).
- sourceCategory: Any category mentioned in the document. Null if none.
- financialCategory: One of: revenue, cogs, payroll, software, marketing, rent, utilities, subscriptions, contractor, shipping, refunds, tax, debt, inventory, transfer, other
- type: income, expense, or transfer
- confidenceScore: 0.0 to 1.0
- notes: Any notable context. Null if nothing.

Rules:
- Credits/deposits/payments received = income
- Debits/charges/payments made = expense
- Skip totals, subtotals, balance lines, headers, and non-transaction text
- If the document is an invoice, the total is one transaction
- Return {"transactions": [...]} as valid JSON`;

/**
 * Extract transactions from raw PDF text using GPT.
 * Splits into chunks if the text is very long.
 */
export async function extractFromText(
    text: string
): Promise<ExtractedTransaction[]> {
    if (!text.trim()) return [];

    // Split into chunks of ~4000 chars to stay within token limits
    const CHUNK_SIZE = 4000;
    const chunks: string[] = [];

    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
        chunks.push(text.slice(i, i + CHUNK_SIZE));
    }

    console.log(`[pdf-extract] Processing ${chunks.length} chunk(s) of PDF text`);

    const allTransactions: ExtractedTransaction[] = [];

    for (let i = 0; i < chunks.length; i++) {
        console.log(`[pdf-extract] Chunk ${i + 1}/${chunks.length}...`);
        const start = Date.now();

        const response = await openai.chat.completions.create(
            {
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    {
                        role: "user",
                        content: `Extract transactions from this PDF text:\n\n${chunks[i]}`,
                    },
                ],
                response_format: { type: "json_object" },
                temperature: 0.1,
            },
            { timeout: 60000 }
        );

        const content = response.choices[0]?.message?.content;
        if (!content) continue;

        try {
            const parsed = JSON.parse(content);
            const transactions: ExtractedTransaction[] = Array.isArray(parsed)
                ? parsed
                : parsed.transactions ?? [];
            allTransactions.push(...transactions);
        } catch (e) {
            console.error(`[pdf-extract] Failed to parse chunk ${i + 1}:`, e);
        }

        console.log(
            `[pdf-extract] Chunk ${i + 1} done in ${((Date.now() - start) / 1000).toFixed(1)}s`
        );
    }

    console.log(
        `[pdf-extract] Complete: ${allTransactions.length} transactions extracted`
    );
    return allTransactions;
}
