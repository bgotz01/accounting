import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPEN_AI_API,
});

export type FileCategory =
    | "bank_statements"
    | "invoices"
    | "receipts"
    | "tax_documents"
    | "payroll"
    | "ads_reports"
    | "other";

export type ClassificationResult = {
    category: FileCategory;
    confidence: number; // 0.0 – 1.0
    reason: string;
};

const VALID_CATEGORIES: FileCategory[] = [
    "bank_statements",
    "invoices",
    "receipts",
    "tax_documents",
    "payroll",
    "ads_reports",
    "other",
];

/**
 * Uses GPT to classify a file into one of the known document categories.
 *
 * @param filename  The original filename (e.g. "ecommerce_bank_transactions_6mo.csv")
 * @param sample    Up to ~500 chars of raw text content from the file (headers + first few rows)
 */
export async function classifyFile(
    filename: string,
    sample: string
): Promise<ClassificationResult> {
    const prompt = `You are a financial document classifier. Given a filename and a short sample of its content, determine which category best describes the document.

Valid categories:
- bank_statements: Bank or credit card transaction exports, account statements
- invoices: Bills, invoices, purchase orders from vendors or to customers
- receipts: Individual purchase receipts
- tax_documents: Tax returns, W-2s, 1099s, VAT filings
- payroll: Payroll reports, salary records, employee compensation
- ads_reports: Advertising or marketing spend reports (Meta, Google Ads, TikTok, etc.)
- other: Anything that doesn't fit the above

Filename: ${filename}

Content sample:
${sample}

Respond with a JSON object only, no markdown:
{
  "category": "<one of the valid categories>",
  "confidence": <0.0 to 1.0>,
  "reason": "<one short sentence explaining why>"
}`;

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 150,
        response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content ?? "{}";

    let parsed: { category?: string; confidence?: number; reason?: string };
    try {
        parsed = JSON.parse(raw);
    } catch {
        return { category: "other", confidence: 0, reason: "Could not parse AI response." };
    }

    const category = VALID_CATEGORIES.includes(parsed.category as FileCategory)
        ? (parsed.category as FileCategory)
        : "other";

    return {
        category,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
        reason: parsed.reason ?? "",
    };
}
