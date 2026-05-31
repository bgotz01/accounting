"use client";

import { createContext, useContext } from "react";
import { formatCurrency, formatCurrencyPrecise } from "@/app/lib/currency";

type CurrencyContextValue = {
    currency: string;
    fmt: (amount: number) => string;
    fmtPrecise: (amount: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue>({
    currency: "USD",
    fmt: (n) => formatCurrency(n, "USD"),
    fmtPrecise: (n) => formatCurrencyPrecise(n, "USD"),
});

export function CurrencyProvider({
    currency,
    children,
}: {
    currency: string;
    children: React.ReactNode;
}) {
    const value: CurrencyContextValue = {
        currency,
        fmt: (n) => formatCurrency(n, currency),
        fmtPrecise: (n) => formatCurrencyPrecise(n, currency),
    };

    return (
        <CurrencyContext.Provider value={value}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency(): CurrencyContextValue {
    return useContext(CurrencyContext);
}
