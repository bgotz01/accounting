import { getDashboardData } from "./actions";
import Link from "next/link";

export default async function DashboardPage() {
    const data = await getDashboardData();

    const hasData = data.transactionCount > 0;

    return (
        <div className="mx-auto max-w-5xl space-y-8">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Dashboard
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Your business at a glance
                </p>
            </div>

            {!hasData ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        No transaction data yet. Upload and process a file to see your
                        dashboard.
                    </p>
                    <Link
                        href="/upload"
                        className="mt-4 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                        Upload a file
                    </Link>
                </div>
            ) : (
                <>
                    {/* Financial Health Cards */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <MetricCard
                            label="Cash In"
                            value={`$${data.totalIncome.toLocaleString()}`}
                            type="income"
                        />
                        <MetricCard
                            label="Cash Out"
                            value={`$${data.totalExpenses.toLocaleString()}`}
                            type="expense"
                        />
                        <MetricCard
                            label="Net Cash Flow"
                            value={`${data.netCashFlow >= 0 ? "" : "-"}$${Math.abs(data.netCashFlow).toLocaleString()}`}
                            type={data.netCashFlow >= 0 ? "income" : "expense"}
                        />
                    </div>

                    {/* Two column layout */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Expenses by Category */}
                        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                            <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Expenses by Category
                            </h2>
                            {data.expensesByCategory.length === 0 ? (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    No expenses recorded.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {data.expensesByCategory.map((cat) => (
                                        <ExpenseRow
                                            key={cat.category}
                                            label={cat.category}
                                            amount={`$${cat.amount.toLocaleString()}`}
                                            pct={cat.pct}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Income Statement Summary */}
                        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                            <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Income Statement
                            </h2>
                            <div className="space-y-2">
                                <StatementRow
                                    label="Revenue"
                                    amount={data.totalIncome}
                                    bold
                                />
                                <StatementRow
                                    label="Total Expenses"
                                    amount={-data.totalExpenses}
                                />
                                <div className="my-2 border-t border-zinc-200 dark:border-zinc-700" />
                                <StatementRow
                                    label="Net Income"
                                    amount={data.netCashFlow}
                                    bold
                                    highlight
                                />
                            </div>
                            <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Based on {data.transactionCount} transactions
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Recent Transactions
                            </h2>
                            <Link
                                href="/transactions"
                                className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                            >
                                View all →
                            </Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-100 text-left text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                                        <th className="pb-3 pr-4">Date</th>
                                        <th className="pb-3 pr-4">Description</th>
                                        <th className="pb-3 pr-4">Category</th>
                                        <th className="pb-3 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {data.recentTransactions.map((t) => (
                                        <tr key={t.id}>
                                            <td className="py-3 pr-4 text-zinc-500 dark:text-zinc-400">
                                                {t.date}
                                            </td>
                                            <td className="py-3 pr-4 text-zinc-900 dark:text-zinc-100">
                                                {t.description}
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                                    {t.financialCategory ?? "other"}
                                                </span>
                                            </td>
                                            <td
                                                className={`py-3 text-right font-medium ${t.type === "income"
                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                        : "text-zinc-900 dark:text-zinc-100"
                                                    }`}
                                            >
                                                {t.type === "income" ? "+" : "-"}$
                                                {t.amount.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function MetricCard({
    label,
    value,
    type,
}: {
    label: string;
    value: string;
    type: "income" | "expense";
}) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {label}
            </p>
            <p
                className={`mt-1.5 text-2xl font-semibold tracking-tight ${type === "income"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
            >
                {value}
            </p>
        </div>
    );
}

function ExpenseRow({
    label,
    amount,
    pct,
}: {
    label: string;
    amount: string;
    pct: number;
}) {
    return (
        <div className="flex items-center gap-3">
            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <span className="text-sm capitalize text-zinc-700 dark:text-zinc-300">
                        {label}
                    </span>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {amount}
                    </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                        className="h-full rounded-full bg-zinc-400 dark:bg-zinc-500"
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

function StatementRow({
    label,
    amount,
    bold,
    highlight,
}: {
    label: string;
    amount: number;
    bold?: boolean;
    highlight?: boolean;
}) {
    return (
        <div className="flex items-center justify-between">
            <span
                className={`text-sm ${bold ? "font-semibold text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400"}`}
            >
                {label}
            </span>
            <span
                className={`text-sm font-medium ${highlight
                        ? amount >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        : bold
                            ? "text-zinc-900 dark:text-zinc-100"
                            : "text-zinc-700 dark:text-zinc-300"
                    }`}
            >
                {amount >= 0 ? "" : "-"}${Math.abs(amount).toLocaleString()}
            </span>
        </div>
    );
}
