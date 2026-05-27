"use client";

import { useEffect, useState } from "react";
import { getIncomeStatements, type PeriodStatement } from "./actions";

type GroupBy = "monthly" | "weekly";

export default function StatementsPage() {
    const [statements, setStatements] = useState<PeriodStatement[]>([]);
    const [groupBy, setGroupBy] = useState<GroupBy>("monthly");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        getIncomeStatements(groupBy).then((data) => {
            setStatements(data);
            setLoading(false);
        });
    }, [groupBy]);

    if (loading) {
        return (
            <div className="mx-auto max-w-6xl py-8">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading statements...</p>
            </div>
        );
    }

    // Newest first (left to right)
    const periods = statements;

    // Collect all categories that appear across all periods
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

    const fmt = (n: number) => {
        if (n === 0) return "—";
        const rounded = Math.round(n);
        return `${rounded < 0 ? "-" : ""}$${Math.abs(rounded).toLocaleString()}`;
    };

    return (
        <div className="mx-auto max-w-full space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Income Statement
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Profit & loss across periods
                    </p>
                </div>
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
            </div>

            {periods.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        No transaction data yet.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                                <th className="sticky left-0 z-10 bg-zinc-50 px-5 py-3 text-left text-xs font-medium text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
                                    &nbsp;
                                </th>
                                {periods.map((stmt) => (
                                    <th
                                        key={stmt.period}
                                        className="min-w-[120px] px-4 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400"
                                    >
                                        {stmt.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Revenue */}
                            <SectionHeader label="Revenue" periods={periods.length} />
                            <DataRow
                                label="Revenue"
                                values={periods.map((s) => s.revenue)}
                                bold
                                fmt={fmt}
                            />

                            {/* COGS */}
                            {allCogs.size > 0 && (
                                <>
                                    <SectionHeader label="Cost of Goods Sold" periods={periods.length} />
                                    <DataRow
                                        label="COGS / Shipping / Inventory"
                                        values={periods.map((s) => -s.cogs)}
                                        indent
                                        fmt={fmt}
                                    />
                                </>
                            )}

                            {/* Gross Profit */}
                            <TotalRow
                                label="Gross Profit"
                                values={periods.map((s) => s.grossProfit)}
                                fmt={fmt}
                            />

                            {/* Operating Expenses */}
                            {opexCategories.length > 0 && (
                                <>
                                    <SectionHeader label="Operating Expenses" periods={periods.length} />
                                    {opexCategories.map((cat) => (
                                        <DataRow
                                            key={cat}
                                            label={cat}
                                            values={periods.map((s) => -(s.operatingExpenses[cat] || 0))}
                                            indent
                                            fmt={fmt}
                                        />
                                    ))}
                                    <DataRow
                                        label="Total Operating Expenses"
                                        values={periods.map((s) => -s.totalOperatingExpenses)}
                                        bold
                                        fmt={fmt}
                                    />
                                </>
                            )}

                            {/* Other Expenses */}
                            {otherCategories.length > 0 && (
                                <>
                                    <SectionHeader label="Other Expenses" periods={periods.length} />
                                    {otherCategories.map((cat) => (
                                        <DataRow
                                            key={cat}
                                            label={cat}
                                            values={periods.map((s) => -(s.otherExpenses[cat] || 0))}
                                            indent
                                            fmt={fmt}
                                        />
                                    ))}
                                    <DataRow
                                        label="Total Other Expenses"
                                        values={periods.map((s) => -s.totalOtherExpenses)}
                                        bold
                                        fmt={fmt}
                                    />
                                </>
                            )}

                            {/* Net Income */}
                            <NetIncomeRow
                                values={periods.map((s) => s.netIncome)}
                                fmt={fmt}
                            />
                        </tbody>
                    </table>
                </div>
            )}

            {/* Operating Cash Flow Statement */}
            {periods.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
                        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            Operating Cash Flow
                        </h2>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            Direct method — cash received and paid from operations
                        </p>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                                <th className="sticky left-0 z-10 bg-zinc-50 px-5 py-3 text-left text-xs font-medium text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
                                    &nbsp;
                                </th>
                                {periods.map((stmt) => (
                                    <th
                                        key={stmt.period}
                                        className="min-w-[120px] px-4 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400"
                                    >
                                        {stmt.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Cash Inflows */}
                            <SectionHeader label="Cash Inflows" periods={periods.length} />
                            <DataRow
                                label="Cash received from customers"
                                values={periods.map((s) => s.revenue)}
                                indent
                                fmt={fmt}
                            />
                            <DataRow
                                label="Total Cash Inflows"
                                values={periods.map((s) => s.revenue)}
                                bold
                                fmt={fmt}
                            />

                            {/* Cash Outflows */}
                            <SectionHeader label="Cash Outflows" periods={periods.length} />
                            {allCogs.size > 0 && (
                                <DataRow
                                    label="Suppliers & inventory"
                                    values={periods.map((s) => -s.cogs)}
                                    indent
                                    fmt={fmt}
                                />
                            )}
                            {opexCategories.map((cat) => (
                                <DataRow
                                    key={cat}
                                    label={`Paid for ${cat}`}
                                    values={periods.map((s) => -(s.operatingExpenses[cat] || 0))}
                                    indent
                                    fmt={fmt}
                                />
                            ))}
                            {otherCategories.map((cat) => (
                                <DataRow
                                    key={cat}
                                    label={`Paid for ${cat}`}
                                    values={periods.map((s) => -(s.otherExpenses[cat] || 0))}
                                    indent
                                    fmt={fmt}
                                />
                            ))}
                            <DataRow
                                label="Total Cash Outflows"
                                values={periods.map((s) => -(s.cogs + s.totalOperatingExpenses + s.totalOtherExpenses))}
                                bold
                                fmt={fmt}
                            />

                            {/* Net Operating Cash Flow */}
                            <NetIncomeRow
                                values={periods.map((s) => s.netIncome)}
                                fmt={fmt}
                                label="Net Operating Cash Flow"
                            />
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function SectionHeader({ label, periods }: { label: string; periods: number }) {
    return (
        <tr className="border-t border-zinc-100 dark:border-zinc-800">
            <td
                colSpan={periods + 1}
                className="sticky left-0 z-10 bg-white px-5 pb-1 pt-4 text-xs font-medium uppercase tracking-wider text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500"
            >
                {label}
            </td>
        </tr>
    );
}

function DataRow({
    label,
    values,
    bold,
    indent,
    fmt,
}: {
    label: string;
    values: number[];
    bold?: boolean;
    indent?: boolean;
    fmt: (n: number) => string;
}) {
    return (
        <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
            <td
                className={`sticky left-0 z-10 bg-white px-5 py-2 capitalize dark:bg-zinc-900 ${indent ? "pl-9" : ""
                    } ${bold ? "font-semibold text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400"}`}
            >
                {label}
            </td>
            {values.map((v, i) => (
                <td
                    key={i}
                    className={`px-4 py-2 text-right tabular-nums ${bold ? "font-semibold text-zinc-900 dark:text-zinc-100" : "text-zinc-700 dark:text-zinc-300"
                        }`}
                >
                    {fmt(v)}
                </td>
            ))}
        </tr>
    );
}

function TotalRow({
    label,
    values,
    fmt,
}: {
    label: string;
    values: number[];
    fmt: (n: number) => string;
}) {
    return (
        <tr className="border-t border-zinc-200 dark:border-zinc-700">
            <td className="sticky left-0 z-10 bg-white px-5 py-2 font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                {label}
            </td>
            {values.map((v, i) => (
                <td
                    key={i}
                    className="px-4 py-2 text-right tabular-nums font-semibold text-zinc-900 dark:text-zinc-100"
                >
                    {fmt(v)}
                </td>
            ))}
        </tr>
    );
}

function NetIncomeRow({
    values,
    fmt,
    label = "Net Income",
}: {
    values: number[];
    fmt: (n: number) => string;
    label?: string;
}) {
    return (
        <tr className="border-t-2 border-zinc-300 dark:border-zinc-600">
            <td className="sticky left-0 z-10 bg-white px-5 py-3 text-sm font-bold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                {label}
            </td>
            {values.map((v, i) => (
                <td
                    key={i}
                    className={`px-4 py-3 text-right tabular-nums text-sm font-bold ${v >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                        }`}
                >
                    {fmt(v)}
                </td>
            ))}
        </tr>
    );
}
