/**
 * Maps a currency code to its symbol for compact display.
 * Falls back to the code itself if unknown.
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    CAD: "CA$",
    AUD: "A$",
    JPY: "¥",
    CHF: "CHF",
    SAR: "﷼",
    AED: "د.إ",
    INR: "₹",
};

export function getCurrencySymbol(currency: string): string {
    return CURRENCY_SYMBOLS[currency] ?? currency;
}

/**
 * Formats a number as a currency string using the business profile currency.
 * e.g. formatCurrency(1234.5, "EUR") → "€1,235"
 *      formatCurrency(1234.5, "USD") → "$1,235"
 *
 * Uses compact integer display (no decimals) for most values, matching the
 * existing toLocaleString() pattern in the app.
 */
export function formatCurrency(amount: number, currency = "USD"): string {
    const symbol = getCurrencySymbol(currency);
    const abs = Math.abs(Math.round(amount));
    const formatted = abs.toLocaleString();
    return amount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

/**
 * Same as formatCurrency but always shows 2 decimal places.
 * Used in the ledger where precision matters.
 */
export function formatCurrencyPrecise(amount: number, currency = "USD"): string {
    const symbol = getCurrencySymbol(currency);
    const abs = Math.abs(amount);
    const formatted = abs.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return amount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}
