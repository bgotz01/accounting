"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getTaxSummary, type TaxSummary } from "./actions";
import { useCurrency } from "@/app/components/currency-context";

export default function TaxPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { fmt } = useCurrency();

    const [data, setData] = useState<TaxSummary | null>(null);
    const [selectedFY, setSelectedFY] = useState(searchParams.get("fy") ?? "");
    const [expanded, setExpanded] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        getTaxSummary(selectedFY || undefined).then((d) => {
            setData(d);
            if (!selectedFY) setSelectedFY(d.fiscalYear);
            setLoading(false);
        });
    }, [selectedFY]);

    function handleFYChange(fy: string) {
        setSelectedFY(fy);
        router.replace(`/tax?fy=${fy}`);
    }

    if (loading || !data) {
        return (
            <div className="mx-auto max-w-3xl py-8">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading tax summary…</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Tax Summary
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Fiscal year {data.fiscalYear} · deductible expenses overview
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={selectedFY}
                        onChange={(e) => handleFYChange(e.target.value)}
                        className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                        {data.availableFiscalYears.map((fy) => (
                            <option key={fy} value={fy}>FY {fy}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => window.print()}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                        Print / PDF
                    </button>
                </div>
            </div>

            {data.categories.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">No expense data for this fiscal year.</p>
                </div>
            ) : (
                <>
                    {/* Summary cards */}
                    <div className="grid gap-4 sm:grid-cols-3">
                        <SummaryCard label="Total Revenue" value={fmt(data.totalRevenue)} color="emerald" />
                        <SummaryCard label="Total Deductible" value={fmt(data.totalDeductible)} color="blue" />
                        <SummaryCard
                            label="Taxable Income"
                            value={fmt(Math.max(0, data.taxableIncome))}
                            color={data.taxableIncome > 0 ? "amber" : "zinc"}
                        />
                    </div>

                    {data.taxPaid > 0 && (
                        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">Tax already paid this year</span>
                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{fmt(data.taxPaid)}</span>
                        </div>
                    )}

                    {/* Deductible categories */}
                    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                Deductible Expenses by Category
                            </h2>
                        </div>
                        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {data.categories.map((cat) => {
                                const pct = data.totalDeductible > 0
                                    ? Math.round((cat.amount / data.totalDeductible) * 100)
                                    : 0;
                                const isExpanded = expanded === cat.category;
                                return (
                                    <div key={cat.category}>
                                        <button
                                            onClick={() => setExpanded(isExpanded ? null : cat.category)}
                                            className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                        {cat.label}
                                                    </span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-zinc-400">{cat.transactionCount} txns</span>
                                                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                            {fmt(cat.amount)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                                        <div
                                                            className="h-full rounded-full bg-blue-400 dark:bg-blue-500"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="w-8 text-right text-xs text-zinc-400">{pct}%</span>
                                                </div>
                                            </div>
                                            <svg
                                                width="14" height="14" viewBox="0 0 14 14" fill="none"
                                                className={`shrink-0 text-zinc-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                            >
                                                <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>

                                        {isExpanded && (
                                            <div className="border-t border-zinc-100 bg-zinc-50/50 px-5 pb-3 pt-2 dark:border-zinc-800 dark:bg-zinc-800/20">
                                                <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                                    Sample transactions (showing up to 5)
                                                </p>
                                                <div className="space-y-1.5">
                                                    {cat.transactions.map((t, i) => (
                                                        <div key={i} className="flex items-center justify-between text-xs">
                                                            <span className="text-zinc-500 dark:text-zinc-400">{t.date}</span>
                                                            <span className="flex-1 truncate px-3 text-zinc-700 dark:text-zinc-300">{t.description}</span>
                                                            <span className="font-medium text-zinc-900 dark:text-zinc-100">{fmt(t.amount)}</span>
                                                        </div>
                                                    ))}
                                                    {cat.transactionCount > 5 && (
                                                        <p className="text-xs text-zinc-400">
                                                            +{cat.transactionCount - 5} more transactions
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Total row */}
                        <div className="flex items-center justify-between border-t-2 border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Total Deductible Expenses</span>
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{fmt(data.totalDeductible)}</span>
                        </div>
                    </div>

                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                        This is an estimate based on your categorised transactions. Consult a tax professional for filing.
                    </p>
                </>
            )}
        </div>
    );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: "emerald" | "blue" | "amber" | "zinc" }) {
    const colors = {
        emerald: "text-emerald-600 dark:text-emerald-400",
        blue: "text-blue-600 dark:text-blue-400",
        amber: "text-amber-600 dark:text-amber-400",
        zinc: "text-zinc-900 dark:text-zinc-100",
    };
    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
            <p className={`mt-1.5 text-2xl font-semibold tracking-tight ${colors[color]}`}>{value}</p>
        </div>
    );
}
