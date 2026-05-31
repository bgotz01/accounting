"use client";

import { useEffect, useState } from "react";
import { getIncomeStatements, type PeriodStatement } from "./actions";
import { getBalanceSheet, type BalanceSheetData } from "../balance-sheet/actions";
import { useCurrency } from "@/app/components/currency-context";

type Tab = "income" | "cashflow" | "balance";
type GroupBy = "monthly" | "weekly";

export default function StatementsPage() {
    const [tab, setTab] = useState<Tab>("income");
    const [groupBy, setGroupBy] = useState<GroupBy>("monthly");
    const [statements, setStatements] = useState<PeriodStatement[]>([]);
    const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);
    const [bsPeriod, setBsPeriod] = useState("");
    const [loading, setLoading] = useState(true);
    const { fmt: fmtCurrency } = useCurrency();

    // Load income/cashflow data
    useEffect(() => {
        if (tab === "balance") return;
        setLoading(true);
        getIncomeStatements(groupBy).then((data) => {
            setStatements(data);
            setLoading(false);
        });
    }, [groupBy, tab]);

    // Load balance sheet data
    useEffect(() => {
        if (tab !== "balance") return;
        setLoading(true);
        getBalanceSheet(bsPeriod || undefined).then((data) => {
            setBalanceSheet(data);
            setLoading(false);
        });
    }, [tab, bsPeriod]);

    const fmt = (n: number) => (n === 0 ? "—" : fmtCurrency(n));
    const fmtBS = (n: number) => fmtCurrency(n);

    const periods = statements;
    const allOpex = new Set<string>();
    const allCogs = new Set<string>();
    const allOther = new Set<string>();
    for (const stmt of periods) {
        Object.keys(stmt.operatingExpenses).forEach((k) => allOpex.add(k));
        if (stmt.cogs > 0) allCogs.add("cogs");
        Object.keys(stmt.otherExpenses).forEach((k) => allOther.add(k));
    }
    const opexCategories = [...allOpex].sort();
    const otherCategories = [...allOther].sort();

    const TABS: { id: Tab; label: string }[] = [
        { id: "income", label: "Income Statement" },
        { id: "cashflow", label: "Cash Flow" },
        { id: "balance", label: "Balance Sheet" },
    ];

    return (
        <div className="mx-auto max-w-full space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Financial Statements
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {tab === "income" && "Profit & loss across periods"}
                        {tab === "cashflow" && "Cash received and paid from operations"}
                        {tab === "balance" && (balanceSheet ? `As of ${balanceSheet.asOf}` : "Assets, liabilities & equity")}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Period grouping — only for income/cashflow */}
                    {tab !== "balance" && (
                        <div className="flex gap-0.5 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
                            {(["monthly", "weekly"] as GroupBy[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setGroupBy(mode)}
                                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${groupBy === mode
                                        ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                                        : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
                                        }`}
                                >
                                    {mode === "monthly" ? "Monthly" : "Weekly"}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Balance sheet period picker */}
                    {tab === "balance" && balanceSheet && (
                        <select
                            value={bsPeriod}
                            onChange={(e) => setBsPeriod(e.target.value)}
                            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                            <option value="">Current (all time)</option>
                            {balanceSheet.periods.map((p) => {
                                const [year, month] = p.split("-");
                                const label = new Date(Number(year), Number(month) - 1).toLocaleString("en-US", { month: "long", year: "numeric" });
                                return <option key={p} value={p}>End of {label}</option>;
                            })}
                        </select>
                    )}

                    {/* Export */}
                    {tab !== "balance" && (
                        <a
                            href="/api/export/statements"
                            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        >
                            Export CSV
                        </a>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-0.5 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 w-fit dark:border-zinc-700 dark:bg-zinc-800">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${tab === t.id
                            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
                </div>
            ) : (
                <>
                    {/* ── Income Statement ── */}
                    {tab === "income" && (
                        periods.length === 0 ? <EmptyState /> : (
                            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                                            <th className="sticky left-0 z-10 bg-zinc-50 px-5 py-3 text-left text-xs font-medium text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">&nbsp;</th>
                                            {periods.map((s) => (
                                                <th key={s.period} className="min-w-[120px] px-4 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400">{s.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <SectionHeader label="Revenue" periods={periods.length} />
                                        <DataRow label="Revenue" values={periods.map((s) => s.revenue)} bold fmt={fmt} />

                                        {allCogs.size > 0 && (
                                            <>
                                                <SectionHeader label="Cost of Goods Sold" periods={periods.length} />
                                                <DataRow label="COGS / Shipping / Inventory" values={periods.map((s) => -s.cogs)} indent fmt={fmt} />
                                            </>
                                        )}

                                        <TotalRow label="Gross Profit" values={periods.map((s) => s.grossProfit)} fmt={fmt} />

                                        {opexCategories.length > 0 && (
                                            <>
                                                <SectionHeader label="Operating Expenses" periods={periods.length} />
                                                {opexCategories.map((cat) => (
                                                    <DataRow key={cat} label={cat} values={periods.map((s) => -(s.operatingExpenses[cat] || 0))} indent fmt={fmt} />
                                                ))}
                                                <DataRow label="Total Operating Expenses" values={periods.map((s) => -s.totalOperatingExpenses)} bold fmt={fmt} />
                                            </>
                                        )}

                                        {otherCategories.length > 0 && (
                                            <>
                                                <SectionHeader label="Other Expenses" periods={periods.length} />
                                                {otherCategories.map((cat) => (
                                                    <DataRow key={cat} label={cat} values={periods.map((s) => -(s.otherExpenses[cat] || 0))} indent fmt={fmt} />
                                                ))}
                                                <DataRow label="Total Other Expenses" values={periods.map((s) => -s.totalOtherExpenses)} bold fmt={fmt} />
                                            </>
                                        )}

                                        <NetIncomeRow values={periods.map((s) => s.netIncome)} fmt={fmt} />
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}

                    {/* ── Cash Flow Statement ── */}
                    {tab === "cashflow" && (
                        periods.length === 0 ? <EmptyState /> : (
                            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                                <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Direct method — cash received and paid from operations
                                    </p>
                                </div>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                                            <th className="sticky left-0 z-10 bg-zinc-50 px-5 py-3 text-left text-xs font-medium text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">&nbsp;</th>
                                            {periods.map((s) => (
                                                <th key={s.period} className="min-w-[120px] px-4 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400">{s.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <SectionHeader label="Cash Inflows" periods={periods.length} />
                                        <DataRow label="Cash received from customers" values={periods.map((s) => s.revenue)} indent fmt={fmt} />
                                        <DataRow label="Total Cash Inflows" values={periods.map((s) => s.revenue)} bold fmt={fmt} />

                                        <SectionHeader label="Cash Outflows" periods={periods.length} />
                                        {allCogs.size > 0 && (
                                            <DataRow label="Suppliers & inventory" values={periods.map((s) => -s.cogs)} indent fmt={fmt} />
                                        )}
                                        {opexCategories.map((cat) => (
                                            <DataRow key={cat} label={`Paid for ${cat}`} values={periods.map((s) => -(s.operatingExpenses[cat] || 0))} indent fmt={fmt} />
                                        ))}
                                        {otherCategories.map((cat) => (
                                            <DataRow key={cat} label={`Paid for ${cat}`} values={periods.map((s) => -(s.otherExpenses[cat] || 0))} indent fmt={fmt} />
                                        ))}
                                        <DataRow label="Total Cash Outflows" values={periods.map((s) => -(s.cogs + s.totalOperatingExpenses + s.totalOtherExpenses))} bold fmt={fmt} />

                                        <NetIncomeRow values={periods.map((s) => s.netIncome)} fmt={fmt} label="Net Operating Cash Flow" />
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}

                    {/* ── Balance Sheet ── */}
                    {tab === "balance" && (
                        !balanceSheet || balanceSheet.totalAssets === 0 ? <EmptyState /> : (
                            <div className="max-w-2xl space-y-4">
                                {/* Balance check */}
                                {(() => {
                                    const balanced = Math.abs(balanceSheet.totalAssets - balanceSheet.totalLiabilitiesAndEquity) < 0.01;
                                    return (
                                        <div className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${balanced
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                                            : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                                            }`}>
                                            {balanced ? "✓ Balanced" : "⚠ Not balanced — check categorisation"}
                                        </div>
                                    );
                                })()}

                                <BSSection title="Assets">
                                    {balanceSheet.assets.map((a) => (
                                        <BSLine key={a.account} label={a.label} value={fmtBS(a.balance)} />
                                    ))}
                                    {balanceSheet.assets.length === 0 && <BSLine label="No asset accounts found" value="—" muted />}
                                    <BSTotalLine label="Total Assets" value={fmtBS(balanceSheet.totalAssets)} />
                                </BSSection>

                                <BSSection title="Liabilities">
                                    {balanceSheet.liabilities.map((l) => (
                                        <BSLine key={l.account} label={l.label} value={fmtBS(l.balance)} />
                                    ))}
                                    {balanceSheet.liabilities.length === 0 && <BSLine label="No liabilities recorded" value="—" muted />}
                                    <BSTotalLine label="Total Liabilities" value={fmtBS(balanceSheet.totalLiabilities)} />
                                </BSSection>

                                <BSSection title="Equity">
                                    <BSLine label="Retained Earnings" value={fmtBS(Math.max(0, balanceSheet.equity))} />
                                    <BSTotalLine label="Total Equity" value={fmtBS(Math.max(0, balanceSheet.equity))} />
                                </BSSection>

                                <div className="rounded-xl border-2 border-zinc-900 bg-zinc-900 px-5 py-4 dark:border-zinc-100 dark:bg-zinc-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-white dark:text-zinc-900">Total Liabilities + Equity</span>
                                        <span className="text-sm font-bold text-white dark:text-zinc-900">{fmtBS(balanceSheet.totalLiabilitiesAndEquity)}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </>
            )}
        </div>
    );
}

// ── Shared table helpers ──────────────────────────────────────────────────────

function EmptyState() {
    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No transaction data yet.</p>
        </div>
    );
}

function SectionHeader({ label, periods }: { label: string; periods: number }) {
    return (
        <tr className="border-t border-zinc-100 dark:border-zinc-800">
            <td colSpan={periods + 1} className="sticky left-0 z-10 bg-white px-5 pb-1 pt-4 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500">
                {label}
            </td>
        </tr>
    );
}

function DataRow({ label, values, bold, indent, fmt }: { label: string; values: number[]; bold?: boolean; indent?: boolean; fmt: (n: number) => string }) {
    return (
        <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
            <td className={`sticky left-0 z-10 bg-white px-5 py-2 capitalize dark:bg-zinc-900 ${indent ? "pl-9" : ""} ${bold ? "font-semibold text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400"}`}>
                {label}
            </td>
            {values.map((v, i) => (
                <td key={i} className={`px-4 py-2 text-right tabular-nums ${bold ? "font-semibold text-zinc-900 dark:text-zinc-100" : "text-zinc-700 dark:text-zinc-300"}`}>
                    {fmt(v)}
                </td>
            ))}
        </tr>
    );
}

function TotalRow({ label, values, fmt }: { label: string; values: number[]; fmt: (n: number) => string }) {
    return (
        <tr className="border-t border-zinc-200 dark:border-zinc-700">
            <td className="sticky left-0 z-10 bg-white px-5 py-2 font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">{label}</td>
            {values.map((v, i) => (
                <td key={i} className="px-4 py-2 text-right tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">{fmt(v)}</td>
            ))}
        </tr>
    );
}

function NetIncomeRow({ values, fmt, label = "Net Income" }: { values: number[]; fmt: (n: number) => string; label?: string }) {
    return (
        <tr className="border-t-2 border-zinc-300 dark:border-zinc-600">
            <td className="sticky left-0 z-10 bg-white px-5 py-3 text-sm font-bold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">{label}</td>
            {values.map((v, i) => (
                <td key={i} className={`px-4 py-3 text-right tabular-nums text-sm font-bold ${v >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {fmt(v)}
                </td>
            ))}
        </tr>
    );
}

// ── Balance sheet helpers ─────────────────────────────────────────────────────

function BSSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{title}</h2>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">{children}</div>
        </div>
    );
}

function BSLine({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
    return (
        <div className="flex items-center justify-between px-5 py-3">
            <span className={`text-sm ${muted ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-700 dark:text-zinc-300"}`}>{label}</span>
            <span className={`text-sm font-medium tabular-nums ${muted ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-900 dark:text-zinc-100"}`}>{value}</span>
        </div>
    );
}

function BSTotalLine({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</span>
            <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{value}</span>
        </div>
    );
}
