"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBalanceSheet, type BalanceSheetData } from "./actions";
import { useCurrency } from "@/app/components/currency-context";

export default function BalanceSheetPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const periodParam = searchParams.get("period") ?? "";
    const { fmtPrecise: fmt } = useCurrency();

    const [data, setData] = useState<BalanceSheetData | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState(periodParam);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        getBalanceSheet(selectedPeriod || undefined).then((d) => {
            setData(d);
            setLoading(false);
        });
    }, [selectedPeriod]);

    function handlePeriodChange(p: string) {
        setSelectedPeriod(p);
        const params = new URLSearchParams();
        if (p) params.set("period", p);
        router.replace(`/balance-sheet${p ? `?${params}` : ""}`);
    }

    if (loading || !data) {
        return (
            <div className="mx-auto max-w-2xl py-8">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading balance sheet…</p>
            </div>
        );
    }

    const balanced = Math.abs(data.totalAssets - data.totalLiabilitiesAndEquity) < 0.01;

    return (
        <div className="mx-auto max-w-2xl space-y-8">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Balance Sheet
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        As of {data.asOf}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={selectedPeriod}
                        onChange={(e) => handlePeriodChange(e.target.value)}
                        className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                        <option value="">Current (all time)</option>
                        {data.periods.map((p) => {
                            const [year, month] = p.split("-");
                            const label = new Date(Number(year), Number(month) - 1).toLocaleString("en-US", { month: "long", year: "numeric" });
                            return <option key={p} value={p}>End of {label}</option>;
                        })}
                    </select>
                    <a
                        href="/api/export/transactions"
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                        Export CSV
                    </a>
                </div>
            </div>

            {data.totalAssets === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">No transaction data yet.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Balance check */}
                    <div className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${balanced ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400" : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"}`}>
                        <span>{balanced ? "✓ Balanced" : "⚠ Not balanced — check categorisation"}</span>
                    </div>

                    {/* Assets */}
                    <Section title="Assets">
                        {data.assets.map((a) => (
                            <LineItem key={a.account} label={a.label} value={fmt(a.balance)} />
                        ))}
                        {data.assets.length === 0 && (
                            <p className="px-5 py-3 text-sm text-zinc-400">No asset accounts found.</p>
                        )}
                        <TotalLine label="Total Assets" value={fmt(data.totalAssets)} />
                    </Section>

                    {/* Liabilities */}
                    <Section title="Liabilities">
                        {data.liabilities.map((l) => (
                            <LineItem key={l.account} label={l.label} value={fmt(l.balance)} />
                        ))}
                        {data.liabilities.length === 0 && (
                            <LineItem label="No liabilities recorded" value="—" muted />
                        )}
                        <TotalLine label="Total Liabilities" value={fmt(data.totalLiabilities)} />
                    </Section>

                    {/* Equity */}
                    <Section title="Equity">
                        <LineItem label="Retained Earnings" value={fmt(Math.max(0, data.equity))} />
                        <TotalLine label="Total Equity" value={fmt(Math.max(0, data.equity))} />
                    </Section>

                    {/* Final total */}
                    <div className="rounded-xl border-2 border-zinc-900 bg-zinc-900 px-5 py-4 dark:border-zinc-100 dark:bg-zinc-100">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white dark:text-zinc-900">
                                Total Liabilities + Equity
                            </span>
                            <span className="text-sm font-bold text-white dark:text-zinc-900">
                                {fmt(data.totalLiabilitiesAndEquity)}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {title}
                </h2>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">{children}</div>
        </div>
    );
}

function LineItem({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
    return (
        <div className="flex items-center justify-between px-5 py-3">
            <span className={`text-sm ${muted ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-700 dark:text-zinc-300"}`}>
                {label}
            </span>
            <span className={`text-sm font-medium tabular-nums ${muted ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-900 dark:text-zinc-100"}`}>
                {value}
            </span>
        </div>
    );
}

function TotalLine({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</span>
            <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{value}</span>
        </div>
    );
}
