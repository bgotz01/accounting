"use client";

import { useActionState, useState } from "react";
import { saveApiKey, removeApiKey, type ApiKeyState } from "./api-key-actions";

const PROVIDER_LABELS: Record<"openai" | "anthropic", { name: string; color: string }> = {
    openai: { name: "OpenAI", color: "text-emerald-600 dark:text-emerald-400" },
    anthropic: { name: "Anthropic", color: "text-orange-600 dark:text-orange-400" },
};

export function ApiKeyForm({
    initialHasKey,
    initialProvider,
    freeCredits,
}: {
    initialHasKey: boolean;
    initialProvider: "openai" | "anthropic" | null;
    freeCredits: number;
}) {
    const [saveState, saveAction, savePending] = useActionState(saveApiKey, {});
    const [removeState, removeAction, removePending] = useActionState(removeApiKey, {});
    const [showInput, setShowInput] = useState(!initialHasKey);

    const hasKey = saveState.hasKey ?? (removeState.hasKey === false ? false : initialHasKey);
    const provider = saveState.provider ?? (removeState.hasKey === false ? null : initialProvider);

    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-5">
                <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    AI API Key
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                    Add your own OpenAI or Anthropic key. If not set, the app-wide key is used.
                </p>
            </div>

            {/* Free tier credits — only shown when user has no own key */}
            {!hasKey && (
                <div className={`mb-4 flex items-center justify-between rounded-lg border px-3 py-2.5 text-xs ${freeCredits > 0
                        ? "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950"
                        : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"
                    }`}>
                    <span className={freeCredits > 0 ? "text-blue-700 dark:text-blue-300" : "text-amber-700 dark:text-amber-300"}>
                        {freeCredits > 0
                            ? <>Free AI credits remaining: <strong>{freeCredits}</strong> of 10</>
                            : "Free credits exhausted — add your own API key to continue using AI features"
                        }
                    </span>
                </div>
            )}

            {hasKey && !showInput ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800">
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">API key</span>
                        <span className="font-mono text-sm text-zinc-400 dark:text-zinc-500">••••••••••••••••</span>
                        {provider && (
                            <span className={`ml-auto text-xs font-medium ${PROVIDER_LABELS[provider].color}`}>
                                {PROVIDER_LABELS[provider].name}
                            </span>
                        )}
                    </div>

                    {removeState.success && (
                        <p role="status" aria-live="polite" className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            Key removed.
                        </p>
                    )}

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setShowInput(true)}
                            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            Replace key
                        </button>
                        <form action={removeAction}>
                            <button
                                type="submit"
                                disabled={removePending}
                                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                            >
                                {removePending ? "Removing…" : "Remove key"}
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                <form action={saveAction} className="space-y-3">
                    <div>
                        <label htmlFor="apiKey" className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            API Key
                        </label>
                        <input
                            id="apiKey"
                            name="apiKey"
                            type="password"
                            autoComplete="off"
                            placeholder="sk-… or sk-ant-…"
                            className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500"
                        />
                        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                            OpenAI keys start with <code className="font-mono">sk-</code>, Anthropic keys with <code className="font-mono">sk-ant-</code>
                        </p>
                    </div>

                    {saveState.error && (
                        <p role="alert" aria-live="polite" className="text-xs font-medium text-red-600 dark:text-red-400">
                            {saveState.error}
                        </p>
                    )}

                    {saveState.success && (
                        <p role="status" aria-live="polite" className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            Key saved.
                        </p>
                    )}

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={savePending}
                            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                            {savePending ? "Saving…" : "Save Key"}
                        </button>
                        {hasKey && (
                            <button
                                type="button"
                                onClick={() => setShowInput(false)}
                                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            )}
        </div>
    );
}
