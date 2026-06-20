"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { detectProvider } from "@/app/lib/ai-client";

export type ApiKeyState = {
    success?: boolean;
    error?: string;
    hasKey?: boolean;
    provider?: "openai" | "anthropic" | null;
};

export async function getApiKeyStatus(): Promise<{ hasKey: boolean; provider: "openai" | "anthropic" | null; freeCredits: number }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const record = await prisma.user.findUnique({
        where: { id: user.id },
        select: { aiApiKey: true, freeAiCredits: true },
    });

    const key = record?.aiApiKey ?? null;
    return {
        hasKey: !!key,
        provider: key ? detectProvider(key) : null,
        freeCredits: record?.freeAiCredits ?? 0,
    };
}

export async function saveApiKey(
    _prevState: ApiKeyState,
    formData: FormData
): Promise<ApiKeyState> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const key = (formData.get("apiKey") as string | null)?.trim();

    if (!key) {
        return { error: "Please enter an API key." };
    }

    const provider = detectProvider(key);
    if (!provider) {
        return { error: "Unrecognised key format. OpenAI keys start with sk- and Anthropic keys start with sk-ant-." };
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { aiApiKey: key },
    });

    revalidatePath("/profile");
    return { success: true, hasKey: true, provider };
}

export async function removeApiKey(
    _prevState: ApiKeyState,
): Promise<ApiKeyState> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    await prisma.user.update({
        where: { id: user.id },
        data: { aiApiKey: null },
    });

    revalidatePath("/profile");
    return { success: true, hasKey: false, provider: null };
}
