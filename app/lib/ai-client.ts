import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModelV1 } from "ai";
import { prisma } from "@/app/lib/prisma";

export type ModelTier = "standard" | "large";

// Model equivalents per provider
const OPENAI_MODELS: Record<ModelTier, string> = {
    standard: "gpt-4o-mini",
    large: "gpt-4o",
};

const ANTHROPIC_MODELS: Record<ModelTier, string> = {
    standard: "claude-haiku-4-5",
    large: "claude-sonnet-4-5",
};

/**
 * Detect which provider an API key belongs to based on its prefix.
 * OpenAI keys start with "sk-" (but not "sk-ant-").
 * Anthropic keys start with "sk-ant-".
 */
export function detectProvider(apiKey: string): "openai" | "anthropic" | null {
    if (!apiKey) return null;
    if (apiKey.startsWith("sk-ant-")) return "anthropic";
    if (apiKey.startsWith("sk-")) return "openai";
    return null;
}

/**
 * Returns a LanguageModelV1 instance for the given API key and tier.
 * Throws if the key is missing or unrecognised.
 */
export function getModel(apiKey: string, tier: ModelTier = "standard"): LanguageModelV1 {
    const provider = detectProvider(apiKey);

    if (provider === "anthropic") {
        const anthropic = createAnthropic({ apiKey });
        return anthropic(ANTHROPIC_MODELS[tier]);
    }

    if (provider === "openai") {
        const openai = createOpenAI({ apiKey });
        return openai(OPENAI_MODELS[tier]);
    }

    throw new Error(
        "Unrecognised API key format. Expected an OpenAI key (sk-…) or Anthropic key (sk-ant-…)."
    );
}

/**
 * Resolves the API key to use: user-supplied key takes priority over the env fallback.
 */
function getFallbackApiKey(): string | null {
    return (
        process.env.API_KEY?.trim() ||
        process.env.OPENAI_API_KEY?.trim() ||
        process.env.ANTHROPIC_API_KEY?.trim() ||
        null
    );
}

export function resolveApiKey(userKey?: string | null): string {
    const key = userKey?.trim() || getFallbackApiKey() || "";
    if (!key) {
        throw new Error("No API key configured. Add your key in Profile → API Key.");
    }
    return key;
}

/**
 * Checks whether the env fallback key is being used (i.e. user has no own key).
 */
export function isUsingEnvKey(userKey?: string | null): boolean {
    return !userKey?.trim() && !!getFallbackApiKey();
}

/**
 * For operations counted against the free tier (file processing, insights —
 * NOT chat). Call this before the AI operation. Throws a user-friendly error
 * when the user has exhausted their free credits and has no own key.
 *
 * Uses an atomic decrement so concurrent requests can't double-spend.
 */
export async function consumeAiCredit(userId: string, userKey?: string | null): Promise<void> {
    // Users with their own key are never limited
    if (userKey?.trim()) return;

    // No env key means AI won't work at all — resolveApiKey will throw later
    if (!getFallbackApiKey()) return;

    // Atomically decrement, but only if credits remain
    const updated = await prisma.user.updateMany({
        where: { id: userId, freeAiCredits: { gt: 0 } },
        data: { freeAiCredits: { decrement: 1 } },
    });

    if (updated.count === 0) {
        throw new Error(
            "FREE_TIER_EXHAUSTED: You've used all your free AI credits. Add your own OpenAI or Anthropic API key in Profile → API Key to continue."
        );
    }
}
