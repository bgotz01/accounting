"use server";

import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { redirect } from "next/navigation";

const MAX_CUSTOM_CATEGORIES = 3;

export async function getCustomCategories(): Promise<string[]> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { customCategories: true },
    });

    return dbUser?.customCategories ?? [];
}

export async function addCustomCategory(name: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Not authenticated" };
    }

    const cleaned = name.trim().toLowerCase().replace(/[^a-z0-9_\s-]/g, "");
    if (!cleaned) {
        return { error: "Invalid category name" };
    }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { customCategories: true },
    });

    const existing = dbUser?.customCategories ?? [];

    if (existing.length >= MAX_CUSTOM_CATEGORIES) {
        return { error: `Maximum ${MAX_CUSTOM_CATEGORIES} custom categories allowed` };
    }

    if (existing.includes(cleaned)) {
        return { error: "Category already exists" };
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { customCategories: [...existing, cleaned] },
    });

    return { success: true, categories: [...existing, cleaned] };
}

export async function removeCustomCategory(name: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Not authenticated" };
    }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { customCategories: true },
    });

    const existing = dbUser?.customCategories ?? [];
    const updated = existing.filter((c) => c !== name);

    await prisma.user.update({
        where: { id: user.id },
        data: { customCategories: updated },
    });

    return { success: true, categories: updated };
}
