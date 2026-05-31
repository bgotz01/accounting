"use client";

import { useState } from "react";
import { generateInsights, type AiInsight } from "./insights-actions";

const SEVERITY_STYLES: Record<string, string> = {
    warning: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
    success: "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30",
    info: "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50",
};

const SEVERITY_BADGE: Record<string, string> = {
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    info: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const TYPE_ICONS: Record<string, string> = {
    trend: "📈",
    warning: "⚠️",
    opportunity: "💡",
    anomaly: "🔍",
    benchmark: "📊",
};

export function InsightsPanel({ initialInsights }: { initialInsights: AiInsight[] }) {
    const [insights, setInsights] = useState<AiInsight[]>(initialInsights);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleGenerate() {
        setLoading(true);
        setError(null);
        const result = await generateInsights();
        if (result.error) setError(result.error);
        else setInsights(result.insights);
        setLoading(false);
    }

    const lastUpdated = insights[0]
        ? new Date(insights[0].createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : null;

    return (
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
                <div>
                    <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">AI Insights</h2>
                    {lastUpdated && (
                        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                            Last updated {lastUpdated}
                        </p>
                    )}
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                    {loading ? (
                        <>
                            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-300" />
                            Analysing…
                        </>
                    ) : (
                        <>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M10 6A4 4 0 1 1 6 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                <path d="M6 2l1.5-1.5L9 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {insights.length > 0 ? "Refresh" : "Generate insights"}
                        </>
                    )}
                </button>
            </div>

            <div className="p-6">
                {error && (
                    <p className="mb-4 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
                )}

                {insights.length === 0 && !loading ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Click "Generate insights" to get AI-powered analysis of your financial data.
                    </p>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {insights.map((insight) => (
                            <div
                                key={insight.id}
                                className={`rounded-lg border p-4 ${SEVERITY_STYLES[insight.severity] ?? SEVERITY_STYLES.info}`}
                            >
                                <div className="mb-2 flex items-start justify-between gap-2">
                                    <span className="text-base leading-none">
                                        {TYPE_ICONS[insight.type] ?? "💡"}
                                    </span>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SEVERITY_BADGE[insight.severity] ?? SEVERITY_BADGE.info}`}>
                                        {insight.type}
                                    </span>
                                </div>
                                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    {insight.title}
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                                    {insight.content}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
