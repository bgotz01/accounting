import { getDashboardData } from "./actions";
import { getBusinessProfile } from "./business-profile-actions";
import { getInsights } from "./insights-actions";
import { InsightsPanel } from "./insights-panel";
import { formatCurrency } from "@/app/lib/currency";
import Link from "next/link";

export default async function DashboardPage() {
    const [data, businessProfile, insights] = await Promise.all([
        getDashboardData(),
        getBusinessProfile(),
        getInsights(),
    ]);
    const hasData = data.transactionCount > 0;
    const currency = businessProfile?.currency ?? "USD";
    const fmt = (n: number) => formatCurrency(n, currency);

    return (
        <div className="mx-auto max-w-5xl space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Dashboard
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {businessProfile?.businessName
                            ? `${businessProfile.businessName} · ${businessProfile.currency}${businessProfile.country ? ` · ${businessProfile.country}` : ""}${businessProfile.accountingStandard ? ` · ${businessProfile.accountingStandard}` : ""}`
                            : "Your business at a glance"}
                    </p>
                </div>
                <Link
                    href="/profile"
                    className="self-start rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 sm:self-auto dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                    {businessProfile ? "Edit profile" : "Set up profile"}
                </Link>
            </div>

            {!hasData ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        No transaction data yet. Upload and process a file to see your dashboard.
                    </p>
                    <Link
                        href="/documents"
                        className="mt-4 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                        Upload a file
                    </Link>
                </div>
            ) : (
                <>
                    {/* Top metrics */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <MetricCard
                            label="Revenue"
                            value={fmt(data.totalIncome)}
                            type="income"
                        />
                        <MetricCard
                            label="Expenses"
                            value={fmt(data.totalExpenses)}
                            type="expense"
                        />
                        <MetricCard
                            label="Net Income"
                            value={fmt(data.netCashFlow)}
                            type={data.netCashFlow >= 0 ? "income" : "expense"}
                        />
                        <MetricCard
                            label="Profit Margin"
                            value={`${data.profitMargin}%`}
                            type={data.profitMargin >= 0 ? "income" : "expense"}
                        />
                    </div>

                    {/* Monthly trend */}
                    {data.monthlyTrends.length > 1 && (
                        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                            <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Monthly Net Income
                            </h2>
                            <div className="overflow-x-auto">
                                <div className="flex gap-3">
                                    {data.monthlyTrends.map((m) => (
                                        <div key={m.month} className="flex min-w-[90px] flex-col items-center gap-1.5 rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-800/30">
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                {m.month}
                                            </span>
                                            <span
                                                className={`text-sm font-semibold ${m.net >= 0
                                                    ? "text-emerald-600 dark:text-emerald-400"
                                                    : "text-red-600 dark:text-red-400"
                                                    }`}
                                            >
                                                {fmt(m.net)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Two column: expenses + top recurring */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Expenses by Category */}
                        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                            <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Expenses by Category
                            </h2>
                            <div className="space-y-3">
                                {data.expensesByCategory.slice(0, 7).map((cat) => (
                                    <div key={cat.category} className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm capitalize text-zinc-700 dark:text-zinc-300">
                                                    {cat.category}
                                                </span>
                                                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                    {fmt(cat.amount)}
                                                </span>
                                            </div>
                                            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                                <div
                                                    className="h-full rounded-full bg-zinc-400 dark:bg-zinc-500"
                                                    style={{ width: `${cat.pct}%` }}
                                                />
                                            </div>
                                        </div>
                                        <span className="w-8 text-right text-xs text-zinc-400">
                                            {cat.pct}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Expenses */}
                        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                            <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Top Expenses
                            </h2>
                            <div className="space-y-2.5">
                                {data.topExpenses.map((exp) => (
                                    <div
                                        key={exp.description}
                                        className="flex items-center justify-between"
                                    >
                                        <div>
                                            <p className="text-sm text-zinc-900 dark:text-zinc-100">
                                                {exp.description}
                                                {exp.isRecurring && (
                                                    <span className="ml-1.5 inline-flex rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                        recurring
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                {exp.occurrences}× · {exp.financialCategory}
                                            </p>
                                        </div>
                                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                            {fmt(exp.totalAmount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">                        <div className="mb-4 flex items-center justify-between">
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
                                                <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium capitalize text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                                    {t.financialCategory ?? "other"}
                                                </span>
                                            </td>
                                            <td
                                                className={`py-3 text-right font-medium ${t.type === "income"
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
                    </div>

                    {/* AI Insights */}
                    <InsightsPanel initialInsights={insights} />
                </>
            )}
        </div>
    );
}

function MetricCard({
    label,
    value,
    change,
    type,
}: {
    label: string;
    value: string;
    change?: number | null;
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
            {change !== undefined && change !== null && (
                <p
                    className={`mt-1 text-xs font-medium ${change >= 0
                        ? type === "income"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        : type === "income"
                            ? "text-red-600 dark:text-red-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                >
                    {change >= 0 ? "+" : ""}
                    {change}% vs last month
                </p>
            )}
        </div>
    );
}
