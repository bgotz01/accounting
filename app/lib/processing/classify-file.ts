import { generateObject } from "ai";
import { z } from "zod";
import { getModel, resolveApiKey } from "@/app/lib/ai-client";

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
    confidence: number;
    reason: string;
};

const ClassificationSchema = z.object({
    category: z.enum([
        "bank_statements",
        "invoices",
        "receipts",
        "tax_documents",
        "payroll",
        "ads_reports",
        "other",
    ]),
    confidence: z.number().min(0).max(1),
    reason: z.string(),
});

/**
 * Uses AI to classify a file into one of the known document categories.
 * Supports both OpenAI and Anthropic keys.
 */
export async function classifyFile(
    filename: string,
    sample: string,
    userApiKey?: string | null
): Promise<ClassificationResult> {
    const apiKey = await resolveApiKey(userApiKey);
    const model = getModel(apiKey, "standard");

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
${sample}`;

    const { object } = await generateObject({
        model,
        schema: ClassificationSchema,
        prompt,
        temperature: 0,
    });

    return object;
}
