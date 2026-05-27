import type { RawRow } from "./parse-file";

/**
 * Map common source categories to our financial categories.
 * Case-insensitive matching.
 */
const CATEGORY_MAP: Record<string, string> = {
    // Revenue
    revenue: "revenue",
    income: "revenue",
    sales: "revenue",
    payout: "revenue",

    // COGS
    cogs: "cogs",
    "cost of goods": "cogs",

    // Marketing
    advertising: "marketing",
    ads: "marketing",
    marketing: "marketing",

    // Payroll
    payroll: "payroll",
    salary: "payroll",
    wages: "payroll",

    // Software
    software: "software",
    saas: "software",

    // Rent
    rent: "rent",
    lease: "rent",
    warehouse: "rent",

    // Utilities
    utilities: "utilities",

    // Subscriptions
    subscriptions: "subscriptions",
    subscription: "subscriptions",

    // Contractors
    contractor: "contractor",
    contractors: "contractor",
    freelance: "contractor",

    // Shipping
    shipping: "shipping",
    logistics: "shipping",
    delivery: "shipping",

    // Refunds
    refunds: "refunds",
    refund: "refunds",

    // Tax
    tax: "tax",
    taxes: "tax",

    // Debt
    debt: "debt",
    loan: "debt",
    interest: "debt",

    // Inventory
    inventory: "inventory",

    // Transfer
    transfer: "transfer",
};

function mapCategory(sourceCategory: string): string {
    const lower = sourceCategory.toLowerCase().trim();
    return CATEGORY_MAP[lower] ?? "other";
}

type DirectTransaction = {
    date: string;
    description: string;
    amount: number;
    sourceCategory: string | null;
    financialCategory: string;
    type: "income" | "expense" | "transfer";
};

/**
 * Check if a CSV has the right structure for direct import (no AI needed).
 * Requires at minimum: a date column and an amount column.
 */
export function canDirectImport(headers: string[]): boolean {
    const lower = headers.map((h) => h.toLowerCase().trim());
    const hasDate = lower.some((h) =>
        ["date", "transaction date", "trans date", "posting date"].includes(h)
    );
    const hasAmount = lower.some((h) =>
        ["amount", "total", "value", "debit", "credit"].includes(h)
    );
    return hasDate && hasAmount;
}

/**
 * Directly import rows without AI — much faster for structured CSVs.
 */
export function directImport(
    rows: RawRow[],
    headers: string[]
): DirectTransaction[] {
    const lower = headers.map((h) => h.toLowerCase().trim());

    // Find column indices
    const dateCol = headers[lower.findIndex((h) =>
        ["date", "transaction date", "trans date", "posting date"].includes(h)
    )];
    const amountCol = headers[lower.findIndex((h) =>
        ["amount", "total", "value"].includes(h)
    )];
    const descCol = headers[lower.findIndex((h) =>
        ["description", "desc", "memo", "narrative", "details", "name"].includes(h)
    )];
    const catCol = headers[lower.findIndex((h) =>
        ["category", "type", "classification", "class"].includes(h)
    )];

    if (!dateCol || !amountCol) {
        return [];
    }

    const transactions: DirectTransaction[] = [];

    for (const row of rows) {
        const dateStr = row[dateCol]?.trim();
        const amountStr = row[amountCol]?.trim();
        const description = row[descCol]?.trim() || row[dateCol]?.trim() || "Unknown";
        const sourceCategory = row[catCol]?.trim() || null;

        if (!dateStr || !amountStr) continue;

        // Parse amount
        const amount = parseFloat(amountStr.replace(/[,$]/g, ""));
        if (isNaN(amount)) continue;

        // Parse date — try ISO format first, then common formats
        let date = dateStr;
        if (!/^\d{4}-\d{2}-\d{2}/.test(date)) {
            // Try to parse other formats
            const parsed = new Date(date);
            if (!isNaN(parsed.getTime())) {
                date = parsed.toISOString().split("T")[0];
            } else {
                continue; // Skip unparseable dates
            }
        }

        // Determine type and financial category
        const isIncome = amount > 0;
        const type: "income" | "expense" | "transfer" = isIncome ? "income" : "expense";
        const financialCategory = sourceCategory
            ? mapCategory(sourceCategory)
            : isIncome
                ? "revenue"
                : "other";

        transactions.push({
            date,
            description,
            amount: Math.abs(amount),
            sourceCategory,
            financialCategory,
            type,
        });
    }

    return transactions;
}
