"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getTransactions, updateTransactionCategory } from "./actions";
import {
    getCustomCategories,
    addCustomCategory,
    removeCustomCategory,
} from "./categories";
import { useCurrency } from "@/app/components/currency-context";

const DEFAULT_FINANCIAL_CATEGORIES = [
    "revenue",
    "cogs",
    "payroll",
    "software",
    "marketing",
    "rent",
    "utilities",
    "subscriptions",
    "contractor",
    "training",
    "shipping",
    "refunds",
    "tax",
    "debt",
    "inventory",
    "transfer",
    "other",
];

type Transaction = {
    id: string;
    date: string;
    description: string;
    counterparty: string | null;
    amount: number;
    currency: string;
    sourceCategory: string | null;
    financialCategory: string | null;
    type: string;
    confidenceScore: number | null;
    filename: string | null;
    notes: string | null;
    isDuplicate: boolean;
};

type SortField = "date" | "amount" | "description";
type SortDir = "asc" | "desc";
type ViewMode = "all" | "income" | "expense";

export default function TransactionsPage() {
    const searchParams = useSearchParams();
    const fileId = searchParams.get("fileId") ?? undefined;
    const { fmt } = useCurrency();

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [customCategories, setCustomCategories] = useState<string[]>([]);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>("all");
    const [filterSource, setFilterSource] = useState<string | null>(null);
    const [sortField, setSortField] = useState<SortField>("date");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    const allCategories = [...DEFAULT_FINANCIAL_CATEGORIES, ...customCategories];

    useEffect(() => {
        Promise.all([getTransactions(fileId), getCustomCategories()]).then(
            ([txns, custom]) => {
                setTransactions(txns);
                setCustomCategories(custom);
                setLoading(false);
            }
        );
    }, [fileId]);

    const handleCategoryChange = async (id: string, newCategory: string) => {
        await updateTransactionCategory(id, newCategory);
        setTransactions((prev) =>
            prev.map((t) =>
                t.id === id ? { ...t, financialCategory: newCategory } : t
            )
        );
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDir("desc");
        }
    };

    // Filter
    let filtered =
        viewMode === "all"
            ? transactions
            : transactions.filter((t) => t.type === viewMode);

    if (filterSource) {
        filtered = filtered.filter((t) => t.filename === filterSource);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
        let cmp = 0;
        if (sortField === "date") cmp = a.date.localeCompare(b.date);
        else if (sortField === "amount") cmp = a.amount - b.amount;
        else if (sortField === "description")
            cmp = a.description.localeCompare(b.description);
        return sortDir === "asc" ? cmp : -cmp;
    });

    // Pagination
    const PAGE_SIZE = 20;
    const [page, setPage] = useState(1);
    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
    const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // Reset page when filter/sort changes
    useEffect(() => { setPage(1); }, [viewMode, sortField, sortDir]);

    const totalIncome = transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

    if (loading) {
        return (
            <div className="mx-auto max-w-6xl py-8">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Loading transactions...
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Transactions
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {transactions.length} transactions
                    {fileId &&
                        transactions[0]?.filename &&
                        ` from ${transactions[0].filename}`}
                </p>
            </div>

            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Total Income
                    </p>
                    <p className="mt-1 text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                        {fmt(totalIncome)}
                    </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Total Expenses
                    </p>
                    <p className="mt-1 text-xl font-semibold text-red-600 dark:text-red-400">
                        {fmt(totalExpenses)}
                    </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Net
                    </p>
                    <p
                        className={`mt-1 text-xl font-semibold ${totalIncome - totalExpenses >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                    >
                        {fmt(totalIncome - totalExpenses)}
                    </p>
                </div>
            </div>

            {/* Controls row: toggles + custom categories + sort */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex gap-0.5 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">                        {(["all", "income", "expense"] as ViewMode[]).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === mode
                                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                                }`}
                        >
                            {mode === "all"
                                ? `All (${transactions.length})`
                                : mode === "income"
                                    ? `Income (${transactions.filter((t) => t.type === "income").length})`
                                    : `Expenses (${transactions.filter((t) => t.type === "expense").length})`}
                        </button>
                    ))}
                    </div>

                    <button
                        onClick={() => setShowCategoryManager(!showCategoryManager)}
                        className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${showCategoryManager
                            ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                            : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600"
                            }`}
                    >
                        Custom category ({customCategories.length}/3)
                    </button>
                </div>

                <select
                    value={`${sortField}-${sortDir}`}
                    onChange={(e) => {
                        const [field, dir] = e.target.value.split("-") as [
                            SortField,
                            SortDir,
                        ];
                        setSortField(field);
                        setSortDir(dir);
                    }}
                    className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                    <option value="date-desc">Date (newest)</option>
                    <option value="date-asc">Date (oldest)</option>
                    <option value="amount-desc">Amount (highest)</option>
                    <option value="amount-asc">Amount (lowest)</option>
                    <option value="description-asc">Description (A-Z)</option>
                    <option value="description-desc">Description (Z-A)</option>
                </select>

                <select
                    value={filterSource ?? ""}
                    onChange={(e) => setFilterSource(e.target.value || null)}
                    className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                    <option value="">All sources</option>
                    {[...new Set(transactions.map((t) => t.filename).filter(Boolean))].map(
                        (name) => (
                            <option key={name} value={name!}>
                                {name}
                            </option>
                        )
                    )}
                </select>

                <a
                    href="/api/export/transactions"
                    className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                    Export CSV
                </a>
            </div>

            {/* Custom category manager (inline expand) */}
            {showCategoryManager && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex flex-wrap items-center gap-2">
                        {customCategories.map((cat) => (
                            <span
                                key={cat}
                                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            >
                                {cat}
                                <button
                                    onClick={async () => {
                                        const result = await removeCustomCategory(cat);
                                        if (result.categories)
                                            setCustomCategories(result.categories);
                                    }}
                                    className="text-zinc-400 hover:text-red-500"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                        {customCategories.length < 3 && (
                            <div className="flex gap-1.5">
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="Add category"
                                    className="w-32 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                    maxLength={24}
                                    onKeyDown={async (e) => {
                                        if (e.key === "Enter" && newCategoryName.trim()) {
                                            const result = await addCustomCategory(newCategoryName);
                                            if (result.categories) {
                                                setCustomCategories(result.categories);
                                                setNewCategoryName("");
                                            }
                                        }
                                    }}
                                />
                                <button
                                    onClick={async () => {
                                        if (!newCategoryName.trim()) return;
                                        const result = await addCustomCategory(newCategoryName);
                                        if (result.categories) {
                                            setCustomCategories(result.categories);
                                            setNewCategoryName("");
                                        }
                                    }}
                                    className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                                >
                                    Add
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Transactions table — fixed layout */}
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="overflow-x-auto">
                    <table className="w-full table-fixed text-sm">
                        <thead>
                            <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                                <th
                                    className="w-[100px] cursor-pointer px-4 py-3 hover:text-zinc-700 dark:hover:text-zinc-200"
                                    onClick={() => handleSort("date")}
                                >
                                    Date{" "}
                                    {sortField === "date" && (sortDir === "asc" ? "↑" : "↓")}
                                </th>
                                <th
                                    className="w-[200px] cursor-pointer px-4 py-3 hover:text-zinc-700 dark:hover:text-zinc-200"
                                    onClick={() => handleSort("description")}
                                >
                                    Description{" "}
                                    {sortField === "description" &&
                                        (sortDir === "asc" ? "↑" : "↓")}
                                </th>
                                <th className="w-[110px] px-4 py-3">Source</th>
                                <th className="w-[150px] px-4 py-3">Financial Category</th>
                                <th className="w-[80px] px-4 py-3">Type</th>
                                <th className="w-[120px] px-4 py-3">Document</th>
                                <th
                                    className="w-[110px] cursor-pointer px-4 py-3 text-right hover:text-zinc-700 dark:hover:text-zinc-200"
                                    onClick={() => handleSort("amount")}
                                >
                                    Amount{" "}
                                    {sortField === "amount" && (sortDir === "asc" ? "↑" : "↓")}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {paginated.map((t) => (
                                <tr
                                    key={t.id}
                                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                                >
                                    <td className="truncate px-4 py-3 text-zinc-600 dark:text-zinc-400">
                                        {t.date}
                                    </td>
                                    <td className="truncate px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                                        <span className="flex items-center gap-1.5">
                                            {t.description}
                                            {t.isDuplicate && (
                                                <span className="inline-flex shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                    DUP
                                                </span>
                                            )}
                                        </span>
                                    </td>
                                    <td className="truncate px-4 py-3">
                                        {t.sourceCategory ? (
                                            <span className="inline-flex rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                                {t.sourceCategory}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-zinc-400">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <select
                                            value={t.financialCategory ?? "other"}
                                            onChange={(e) =>
                                                handleCategoryChange(t.id, e.target.value)
                                            }
                                            className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                        >
                                            {allCategories.map((cat) => (
                                                <option key={cat} value={cat}>
                                                    {cat}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${t.type === "income"
                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                : t.type === "expense"
                                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                }`}
                                        >
                                            {t.type}
                                        </span>
                                    </td>
                                    <td className="truncate px-4 py-3">
                                        {t.filename ? (
                                            <button
                                                onClick={() => setFilterSource(filterSource === t.filename ? null : t.filename)}
                                                className={`inline-flex max-w-[110px] truncate rounded px-1.5 py-0.5 text-xs transition-colors ${filterSource === t.filename
                                                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                                                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                                                    }`}
                                                title={t.filename}
                                            >
                                                {t.filename}
                                            </button>
                                        ) : (
                                            <span className="text-xs text-zinc-400">—</span>
                                        )}
                                    </td>
                                    <td
                                        className={`px-4 py-3 text-right font-medium ${t.type === "income"
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-zinc-900 dark:text-zinc-100"
                                            }`}
                                    >
                                        {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {sorted.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                        No transactions found.
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(page - 1)}
                                disabled={page === 1}
                                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-zinc-400 dark:hover:bg-zinc-800"
                            >
                                Previous
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                .map((p, idx, arr) => (
                                    <span key={p}>
                                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                                            <span className="px-1 text-xs text-zinc-400">…</span>
                                        )}
                                        <button
                                            onClick={() => setPage(p)}
                                            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${p === page
                                                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                                                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    </span>
                                ))}
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={page === totalPages}
                                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-zinc-400 dark:hover:bg-zinc-800"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
