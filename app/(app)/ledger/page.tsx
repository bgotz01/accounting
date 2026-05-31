"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getLedgerData, type LedgerEntry, type AccountSummary } from "./actions";
import { useCurrency } from "@/app/components/currency-context";

const ACCOUNT_LABELS: Record<string, string> = {
    cash: "Cash",
    revenue: "Revenue",
    cogs: "Cost of Goods Sold",
    payroll: "Payroll",
    software: "Software & Tools",
    marketing: "Marketing",
    rent: "Rent",
    utilities: "Utilities",
    subscriptions: "Subscriptions",
    contractor: "Contractor Fees",
    training: "Training & Development",
    shipping: "Shipping",
    refunds: "Refunds",
    tax: "Tax",
    debt: "Debt",
    inventory: "Inventory",
    transfer: "Transfers",
    other: "Other",
    uncategorized: "Uncategorized",
};

function accountLabel(account: string) {
    return ACCOUNT_LABELS[account] ?? account.charAt(0).toUpperCase() + account.slice(1);
}

export default function LedgerPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const periodParam = searchParams.get("period") ?? undefined;
    const { fmtPrecise: fmt } = useCurrency();

    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [accounts, setAccounts] = useState<AccountSummary[]>([]);
    const [periods, setPeriods] = useState<string[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<string>(periodParam ?? "");
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        getLedgerData(selectedPeriod || undefined).then(({ entries, accounts, periods }) => {
            setEntries(entries);
            setAccounts(accounts);
            setPeriods(periods);
            setLoading(false);
        });
    }, [selectedPeriod]);

    const handlePeriodChange = (p: string) => {
        setSelectedPeriod(p);
        setSelectedAccount(null);
        const params = new URLSearchParams(searchParams.toString());
        if (p) params.set("period", p);
        else params.delete("period");
        router.replace(`/ledger?${params.toString()}`);
    };

    // Entries for the selected account (shown in the drill-down panel)
    const accountEntries = useMemo(() => {
        if (!selectedAccount) return [];
        return entries.filter(
            (e) => e.debitAccount === selectedAccount || e.creditAccount === selectedAccount
        );
    }, [selectedAccount, entries]);

    // Running balance for the drill-down
    const entriesWithBalance = useMemo(() => {
        let running = 0;
        return accountEntries.map((e) => {
            const isDebit = e.debitAccount === selectedAccount;
            const signed = isDebit ? e.amount : -e.amount;
            running += signed;
            return { ...e, side: isDebit ? "DR" : "CR", runningBalance: running };
        });
    }, [accountEntries, selectedAccount]);

    const totalDebits = accounts.reduce((s, a) => s + a.totalDebits, 0);
    const totalCredits = accounts.reduce((s, a) => s + a.totalCredits, 0);

    if (loading) {
        return (
            <div className="mx-auto max-w-6xl py-8">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading ledger…</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                        General Ledger
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Double-entry view of all transactions grouped by account
                    </p>
                </div>

                {/* Period picker */}
                <select
                    value={selectedPeriod}
                    onChange={(e) => handlePeriodChange(e.target.value)}
                    className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                    <option value="">All periods</option>
                    {periods.map((p) => {
                        const [year, month] = p.split("-");
                        const label = new Date(Number(year), Number(month) - 1).toLocaleString("en-US", {
                            month: "long",
                            year: "numeric",
                        });
                        return (
                            <option key={p} value={p}>
                                {label}
                            </option>
                        );
                    })}
                </select>
            </div>

            {/* Trial balance summary cards */}
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Debits</p>
                    <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                        {fmt(totalDebits)}
                    </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Credits</p>
                    <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                        {fmt(totalCredits)}
                    </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Balance Check</p>
                    <p
                        className={`mt-1 text-xl font-semibold ${Math.abs(totalDebits - totalCredits) < 0.01
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                            }`}
                    >
                        {Math.abs(totalDebits - totalCredits) < 0.01 ? "Balanced ✓" : `Off by ${fmt(Math.abs(totalDebits - totalCredits))}`}
                    </p>
                </div>
            </div>

            <div className="flex gap-6">
                {/* Chart of Accounts */}
                <div className="flex-1 min-w-0">
                    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                Chart of Accounts
                            </h2>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-zinc-100 text-left text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                                    <th className="px-4 py-2.5">Account</th>
                                    <th className="px-4 py-2.5 text-right">Debits</th>
                                    <th className="px-4 py-2.5 text-right">Credits</th>
                                    <th className="px-4 py-2.5 text-right">Balance</th>
                                    <th className="px-4 py-2.5 text-right">Entries</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {accounts.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                            No transactions found.
                                        </td>
                                    </tr>
                                ) : (
                                    accounts.map((acc) => {
                                        const isSelected = selectedAccount === acc.account;
                                        return (
                                            <tr
                                                key={acc.account}
                                                onClick={() =>
                                                    setSelectedAccount(isSelected ? null : acc.account)
                                                }
                                                className={`cursor-pointer transition-colors ${isSelected
                                                    ? "bg-zinc-100 dark:bg-zinc-800"
                                                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                                                    }`}
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`h-2 w-2 rounded-full ${acc.account === "cash"
                                                                ? "bg-emerald-500"
                                                                : acc.balance > 0
                                                                    ? "bg-blue-400"
                                                                    : "bg-zinc-300 dark:bg-zinc-600"
                                                                }`}
                                                        />
                                                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                                            {accountLabel(acc.account)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-xs text-zinc-600 dark:text-zinc-400">
                                                    {fmt(acc.totalDebits)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-xs text-zinc-600 dark:text-zinc-400">
                                                    {fmt(acc.totalCredits)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-xs font-semibold">
                                                    <span
                                                        className={
                                                            acc.balance > 0
                                                                ? "text-emerald-600 dark:text-emerald-400"
                                                                : acc.balance < 0
                                                                    ? "text-red-600 dark:text-red-400"
                                                                    : "text-zinc-500"
                                                        }
                                                    >
                                                        {fmt(acc.balance)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-xs text-zinc-400 dark:text-zinc-500">
                                                    {acc.entryCount}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                            {accounts.length > 0 && (
                                <tfoot>
                                    <tr className="border-t-2 border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                                        <td className="px-4 py-3 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                            Total
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                            {fmt(totalDebits)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                            {fmt(totalCredits)}
                                        </td>
                                        <td colSpan={2} />
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>

                {/* Account drill-down panel */}
                {selectedAccount && (
                    <div className="w-[420px] shrink-0">
                        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                    {accountLabel(selectedAccount)}
                                </h2>
                                <button
                                    onClick={() => setSelectedAccount(null)}
                                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                    aria-label="Close"
                                >
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    </svg>
                                </button>
                            </div>

                            <div className="max-h-[520px] overflow-y-auto">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-white dark:bg-zinc-900">
                                        <tr className="border-b border-zinc-100 text-left font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                                            <th className="px-3 py-2">Date</th>
                                            <th className="px-3 py-2">Description</th>
                                            <th className="px-3 py-2 text-center">DR/CR</th>
                                            <th className="px-3 py-2 text-right">Amount</th>
                                            <th className="px-3 py-2 text-right">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {entriesWithBalance.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-3 py-6 text-center text-zinc-400">
                                                    No entries
                                                </td>
                                            </tr>
                                        ) : (
                                            entriesWithBalance.map((e) => (
                                                <tr key={e.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                                    <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">
                                                        {e.date}
                                                    </td>
                                                    <td className="max-w-[140px] truncate px-3 py-2 text-zinc-800 dark:text-zinc-200" title={e.description}>
                                                        {e.description}
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        <span
                                                            className={`rounded px-1.5 py-0.5 font-semibold ${e.side === "DR"
                                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                                                }`}
                                                        >
                                                            {e.side}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300">
                                                        {fmt(e.amount)}
                                                    </td>
                                                    <td
                                                        className={`px-3 py-2 text-right font-mono font-medium ${e.runningBalance >= 0
                                                            ? "text-emerald-600 dark:text-emerald-400"
                                                            : "text-red-600 dark:text-red-400"
                                                            }`}
                                                    >
                                                        {fmt(e.runningBalance)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
