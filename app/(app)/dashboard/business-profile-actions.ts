"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";

export type BusinessProfileData = {
    id: string;
    businessName: string;
    industry: string | null;
    currency: string;
    country: string | null;
    taxId: string | null;
    fiscalYearStart: number;
    accountingStandard: string;
    notes: string | null;
};

export type BusinessProfileState = {
    success?: boolean;
    error?: string;
    profile?: BusinessProfileData | null;
};

export async function getBusinessProfile(): Promise<BusinessProfileData | null> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const profile = await prisma.businessProfile.findUnique({
        where: { userId: user.id },
    });

    if (!profile) return null;

    return {
        id: profile.id,
        businessName: profile.businessName,
        industry: profile.industry,
        currency: profile.currency,
        country: profile.country,
        taxId: profile.taxId,
        fiscalYearStart: profile.fiscalYearStart,
        accountingStandard: profile.accountingStandard,
        notes: profile.notes,
    };
}

export async function upsertBusinessProfile(
    _prevState: BusinessProfileState,
    formData: FormData
): Promise<BusinessProfileState> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const businessName = (formData.get("businessName") as string | null)?.trim();
    if (!businessName) {
        return { error: "Business name is required." };
    }

    const fiscalYearStartRaw = formData.get("fiscalYearStart");
    const fiscalYearStart = fiscalYearStartRaw
        ? parseInt(fiscalYearStartRaw as string, 10)
        : 1;

    try {
        const profile = await prisma.businessProfile.upsert({
            where: { userId: user.id },
            update: {
                businessName,
                industry: (formData.get("industry") as string | null)?.trim() || null,
                currency: (formData.get("currency") as string) || "USD",
                country: (formData.get("country") as string | null)?.trim() || null,
                taxId: (formData.get("taxId") as string | null)?.trim() || null,
                fiscalYearStart,
                accountingStandard: (formData.get("accountingStandard") as string) || "GAAP",
                notes: (formData.get("notes") as string | null)?.trim() || null,
            },
            create: {
                userId: user.id,
                businessName,
                industry: (formData.get("industry") as string | null)?.trim() || null,
                currency: (formData.get("currency") as string) || "USD",
                country: (formData.get("country") as string | null)?.trim() || null,
                taxId: (formData.get("taxId") as string | null)?.trim() || null,
                fiscalYearStart,
                accountingStandard: (formData.get("accountingStandard") as string) || "GAAP",
                notes: (formData.get("notes") as string | null)?.trim() || null,
            },
        });

        revalidatePath("/dashboard");
        revalidatePath("/profile");

        return {
            success: true,
            profile: {
                id: profile.id,
                businessName: profile.businessName,
                industry: profile.industry,
                currency: profile.currency,
                country: profile.country,
                taxId: profile.taxId,
                fiscalYearStart: profile.fiscalYearStart,
                accountingStandard: profile.accountingStandard,
                notes: profile.notes,
            },
        };
    } catch (err) {
        console.error("[upsertBusinessProfile]", err);
        return { error: err instanceof Error ? err.message : "Failed to save business profile. Please try again." };
    }
}
