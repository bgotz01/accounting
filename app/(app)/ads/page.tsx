"use client";

import { useEffect, useState } from "react";
import { getAdsData, type AdsSummary, type CampaignSummary, type DailySpend, type AdsSourceFile } from "./actions";
import { useCurrency } from "@/app/components/currency-context";
import Link from "next/link";

export default function AdsPage() {
    const [summary, setSummary] = useState<AdsSummary | null>(null);
    const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
    const [daily, setDaily] = useState<DailySpend[]>([]);
    const [sourceFiles, setSourceFiles] = useState<AdsSourceFile[]>([]);
    const [selectedFileId, setSelectedFileId] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [dailyPage, setDailyPage] = useState(0);
    const [dailySortAsc, setDailySortAsc] = useState(true);
    const { fmt } = useCurrency();

    useEffect(() => {
        setLoading(true);
        getAdsData(selectedFileId).then(({ summary, campaigns, daily, sourceFiles }) => {
            setSummary(summary);
            setCampaigns(campaigns);
            setDaily(daily);
            setSourceFiles(sourceFiles);
            setLoading(false);
            setDailyPage(0);
        });
    }, [selectedFileId]);

    if (loading) {
        return (
            <div className="mx-auto max-w-5xl py-8">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading ads data...</p>
            </div>
        );
    }

    if (!summary && sourceFiles.length === 0) {
        return (
            <div className="mx-auto max-w-5xl space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Ads Analytics
                    </h1>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        No ads data yet. Upload a marketing report from Documents with the &quot;Ads / Marketing&quot; category.
                    </p>
                    <Link
                        href="/documents"
                        className="mt-4 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                        Upload report
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Ads Analytics
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Marketing performance across campaigns
                        {selectedFileId && sourceFiles.find((f) => f.id === selectedFileId) && (
                            <span> — filtered by <span className="font-medium text-zinc-700 dark:text-zinc-300">{sourceFiles.find((f) => f.id === selectedFileId)!.filename}</span></span>
                        )}
                    </p>
                </div>

                {/* Source file filter */}
                {sourceFiles.length > 0 && (
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            Source:
                        </label>
                        <select
                            value={selectedFileId ?? ""}
                            onChange={(e) => setSelectedFileId(e.target.value || undefined)}
                            className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                            <option value="">All files ({sourceFiles.reduce((s, f) => s + f.recordCount, 0)} records)</option>
                            {sourceFiles.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.filename} ({f.recordCount} records)
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Source documents */}
            {sourceFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedFileId(undefined)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${!selectedFileId
                            ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                            : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                            }`}
                    >
                        All sources
                    </button>
                    {sourceFiles.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setSelectedFileId(f.id === selectedFileId ? undefined : f.id)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${selectedFileId === f.id
                                ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                                : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                                }`}
                            title={`Uploaded ${f.uploadedAt}`}
                        >
                            {f.filename}
                        </button>
                    ))}
                </div>
            )}

            {!summary ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        No data for this source file.
                    </p>
                </div>
            ) : (
                <>
                    {/* Summary metrics */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <MetricCard label="Total Spend" value={fmt(summary.totalSpend)} />
                        <MetricCard label="Revenue" value={fmt(summary.totalRevenue)} />
                        <MetricCard label="ROAS" value={`${summary.overallRoas}x`} highlight={summary.overallRoas >= 2} />
                        <MetricCard label="CPA" value={fmt(summary.cpa)} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-4">
                        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Impressions</p>
                            <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                {summary.totalImpressions.toLocaleString()}
                            </p>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Clicks</p>
                            <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                {summary.totalClicks.toLocaleString()}
                            </p>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Purchases</p>
                            <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                {summary.totalPurchases.toLocaleString()}
                            </p>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">CPC</p>
                            <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                {fmt(summary.cpc)}
                            </p>
                        </div>
                    </div>

                    {/* Campaign breakdown */}
                    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                By Campaign
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                                        <th className="px-5 py-3">Campaign</th>
                                        <th className="px-4 py-3 text-right">Spend</th>
                                        <th className="px-4 py-3 text-right">Revenue</th>
                                        <th className="px-4 py-3 text-right">ROAS</th>
                                        <th className="px-4 py-3 text-right">Purchases</th>
                                        <th className="px-4 py-3 text-right">CPA</th>
                                        <th className="px-4 py-3 text-right">Clicks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {campaigns.map((c) => (
                                        <tr key={c.campaign} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                            <td className="px-5 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                                                {c.campaign}
                                            </td>
                                            <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">
                                                {fmt(c.spend)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">
                                                {fmt(c.revenue)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span
                                                    className={`font-medium ${c.roas >= 2
                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                        : c.roas >= 1
                                                            ? "text-amber-600 dark:text-amber-400"
                                                            : "text-red-600 dark:text-red-400"
                                                        }`}
                                                >
                                                    {c.roas}x
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">
                                                {c.purchases}
                                            </td>
                                            <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">
                                                {fmt(c.cpa)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">
                                                {c.clicks.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Daily spend */}
                    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Daily Spend vs Revenue
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-zinc-100 bg-zinc-50 text-left font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                                        <th className="px-4 py-2">
                                            <button
                                                onClick={() => { setDailySortAsc((v) => !v); setDailyPage(0); }}
                                                className="inline-flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-200"
                                            >
                                                Date
                                                <span className="text-[10px]">{dailySortAsc ? "▲" : "▼"}</span>
                                            </button>
                                        </th>
                                        <th className="px-3 py-2 text-right">Spend</th>
                                        <th className="px-3 py-2 text-right">Revenue</th>
                                        <th className="px-3 py-2 text-right">ROI %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {[...daily].sort((a, b) => dailySortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)).slice(dailyPage * 20, dailyPage * 20 + 20).map((d) => {
                                        const roi = d.spend > 0 ? ((d.revenue - d.spend) / d.spend) * 100 : 0;
                                        return (
                                            <tr key={d.date} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                                <td className="px-4 py-1.5 font-medium text-zinc-900 dark:text-zinc-100">
                                                    {new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                </td>
                                                <td className="px-3 py-1.5 text-right text-zinc-700 dark:text-zinc-300">
                                                    {fmt(d.spend)}
                                                </td>
                                                <td className="px-3 py-1.5 text-right text-zinc-700 dark:text-zinc-300">
                                                    {fmt(d.revenue)}
                                                </td>
                                                <td className="px-3 py-1.5 text-right">
                                                    <span
                                                        className={`font-medium ${roi >= 100
                                                            ? "text-emerald-600 dark:text-emerald-400"
                                                            : roi >= 0
                                                                ? "text-amber-600 dark:text-amber-400"
                                                                : "text-red-600 dark:text-red-400"
                                                            }`}
                                                    >
                                                        {roi.toFixed(0)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {daily.length > 20 && (
                            <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-2 dark:border-zinc-800">
                                <span className="text-xs text-zinc-400">
                                    {dailyPage * 20 + 1}–{Math.min(dailyPage * 20 + 20, daily.length)} of {daily.length}
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setDailyPage((p) => Math.max(0, p - 1))}
                                        disabled={dailyPage === 0}
                                        className="rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-zinc-400 dark:hover:bg-zinc-800"
                                    >
                                        Prev
                                    </button>
                                    <button
                                        onClick={() => setDailyPage((p) => Math.min(Math.ceil(daily.length / 20) - 1, p + 1))}
                                        disabled={dailyPage >= Math.ceil(daily.length / 20) - 1}
                                        className="rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-zinc-400 dark:hover:bg-zinc-800"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function MetricCard({
    label,
    value,
    highlight,
}: {
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
            <p
                className={`mt-1.5 text-2xl font-semibold tracking-tight ${highlight
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-zinc-900 dark:text-zinc-100"
                    }`}
            >
                {value}
            </p>
        </div>
    );
}
