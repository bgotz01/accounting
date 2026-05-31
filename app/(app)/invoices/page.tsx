"use client";

import { useEffect, useActionState, useState } from "react";
import { getInvoices, createInvoice, updateInvoiceStatus, deleteInvoice, type InvoiceRecord } from "./actions";
import { useCurrency } from "@/app/components/currency-context";

const CATEGORIES = [
    "advertising", "contractor", "cogs", "inventory", "marketing", "other",
    "payroll", "rent", "shipping", "software", "subscriptions", "tax", "utilities",
];

const STATUS_STYLES: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    unpaid: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    overdue: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

type FilterStatus = "all" | "unpaid" | "paid" | "overdue";

export default function InvoicesPage() {
    const { fmt } = useCurrency();
    const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
    const [formState, formAction, pending] = useActionState(createInvoice, null);

    useEffect(() => {
        getInvoices().then((data) => { setInvoices(data); setLoading(false); });
    }, []);

    useEffect(() => {
        if (formState?.success) {
            setShowForm(false);
            getInvoices().then(setInvoices);
        }
    }, [formState]);

    async function handleStatusToggle(id: string, currentStatus: string) {
        const newStatus = currentStatus === "paid" ? "unpaid" : "paid";
        await updateInvoiceStatus(id, newStatus);
        setInvoices((prev) =>
            prev.map((inv) =>
                inv.id === id
                    ? { ...inv, status: newStatus, paidDate: newStatus === "paid" ? new Date().toISOString().split("T")[0] : null, isOverdue: false }
                    : inv
            )
        );
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this invoice?")) return;
        await deleteInvoice(id);
        setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    }

    const filtered = filterStatus === "all" ? invoices : invoices.filter((inv) => inv.status === filterStatus);

    const totalUnpaid = invoices.filter((i) => i.status === "unpaid" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);
    const totalOverdue = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
    const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);

    if (loading) {
        return (
            <div className="mx-auto max-w-5xl py-8">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading invoices…</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Invoices</h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Track bills and payments</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${showForm ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200" : "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"}`}
                >
                    {showForm ? "Cancel" : "Add invoice"}
                </button>
            </div>

            {/* Summary cards */}
            {invoices.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Outstanding</p>
                        <p className="mt-1 text-xl font-semibold text-amber-600 dark:text-amber-400">{fmt(totalUnpaid)}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Overdue</p>
                        <p className={`mt-1 text-xl font-semibold ${totalOverdue > 0 ? "text-red-600 dark:text-red-400" : "text-zinc-400 dark:text-zinc-500"}`}>{fmt(totalOverdue)}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Paid (all time)</p>
                        <p className="mt-1 text-xl font-semibold text-emerald-600 dark:text-emerald-400">{fmt(totalPaid)}</p>
                    </div>
                </div>
            )}

            {/* Add invoice form */}
            {showForm && (
                <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">New Invoice</h2>
                    <form action={formAction}>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                    Vendor / Supplier <span className="text-red-500">*</span>
                                </label>
                                <input name="vendor" required placeholder="Acme Supplies" className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Invoice Number</label>
                                <input name="invoiceNumber" placeholder="INV-001" className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                    Amount <span className="text-red-500">*</span>
                                </label>
                                <input name="amount" type="number" step="0.01" min="0" required placeholder="0.00" className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                    Issue Date <span className="text-red-500">*</span>
                                </label>
                                <input name="issueDate" type="date" required defaultValue={new Date().toISOString().split("T")[0]} className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Due Date</label>
                                <input name="dueDate" type="date" className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Category</label>
                                <select name="category" defaultValue="other" className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Paid Date (leave blank if unpaid)</label>
                                <input name="paidDate" type="date" className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">Notes</label>
                                <input name="notes" placeholder="Optional notes…" className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500" />
                            </div>
                        </div>
                        {formState?.error && (
                            <p className="mt-3 text-xs font-medium text-red-600 dark:text-red-400">{formState.error}</p>
                        )}
                        <div className="mt-5">
                            <button type="submit" disabled={pending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
                                {pending ? "Saving…" : "Save Invoice"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filter tabs */}
            {invoices.length > 0 && (
                <div className="flex gap-0.5 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 w-fit dark:border-zinc-700 dark:bg-zinc-800">
                    {(["all", "unpaid", "overdue", "paid"] as FilterStatus[]).map((s) => {
                        const count = s === "all" ? invoices.length : invoices.filter((i) => i.status === s).length;
                        return (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${filterStatus === s ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"}`}
                            >
                                {s} ({count})
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Invoice list */}
            {filtered.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {invoices.length === 0 ? "No invoices yet. Add your first one above." : "No invoices in this category."}
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                                <th className="px-5 py-3">Vendor</th>
                                <th className="px-4 py-3">Invoice #</th>
                                <th className="px-4 py-3">Issue Date</th>
                                <th className="px-4 py-3">Due Date</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Amount</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {filtered.map((inv) => (
                                <tr key={inv.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                    <td className="px-5 py-3">
                                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{inv.vendor}</p>
                                        {inv.notes && <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate max-w-[160px]">{inv.notes}</p>}
                                    </td>
                                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                                        {inv.invoiceNumber ?? <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{inv.issueDate}</td>
                                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                                        {inv.dueDate ?? <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex rounded bg-zinc-100 px-1.5 py-0.5 text-xs capitalize text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                            {inv.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => handleStatusToggle(inv.id, inv.status)}
                                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-70 ${STATUS_STYLES[inv.status] ?? STATUS_STYLES.unpaid}`}
                                            title="Click to toggle paid/unpaid"
                                        >
                                            {inv.status}
                                        </button>
                                        {inv.paidDate && (
                                            <p className="mt-0.5 text-[10px] text-zinc-400">{inv.paidDate}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-zinc-100">
                                        {fmt(inv.amount)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => handleDelete(inv.id)}
                                            className="text-xs text-zinc-400 hover:text-red-500 dark:hover:text-red-400"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
