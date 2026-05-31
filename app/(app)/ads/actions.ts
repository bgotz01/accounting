"use server";

import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { redirect } from "next/navigation";

export type AdsSummary = {
    totalSpend: number;
    totalRevenue: number;
    totalImpressions: number;
    totalClicks: number;
    totalPurchases: number;
    overallRoas: number;
    cpa: number;
    cpc: number;
};

export type CampaignSummary = {
    campaign: string;
    spend: number;
    impressions: number;
    clicks: number;
    purchases: number;
    revenue: number;
    roas: number;
    cpa: number;
};

export type DailySpend = {
    date: string;
    spend: number;
    revenue: number;
};

export type AdsSourceFile = {
    id: string;
    filename: string;
    recordCount: number;
    uploadedAt: string;
};

export async function getAdsData(fileId?: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Build filter
    const where: { userId: string; fileId?: string } = { userId: user.id };
    if (fileId) {
        where.fileId = fileId;
    }

    const records = await prisma.adSpend.findMany({
        where,
        orderBy: { date: "asc" },
    });

    // Get all source files for the filter dropdown
    const allRecords = await prisma.adSpend.findMany({
        where: { userId: user.id },
        select: { fileId: true, file: { select: { id: true, filename: true, createdAt: true } } },
    });

    const fileMap = new Map<string, { id: string; filename: string; uploadedAt: string; count: number }>();
    for (const r of allRecords) {
        if (r.fileId && r.file) {
            const existing = fileMap.get(r.fileId);
            if (existing) {
                existing.count++;
            } else {
                fileMap.set(r.fileId, {
                    id: r.file.id,
                    filename: r.file.filename,
                    uploadedAt: r.file.createdAt.toISOString().split("T")[0],
                    count: 1,
                });
            }
        }
    }

    const sourceFiles: AdsSourceFile[] = [...fileMap.values()]
        .map((f) => ({
            id: f.id,
            filename: f.filename,
            recordCount: f.count,
            uploadedAt: f.uploadedAt,
        }))
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

    if (records.length === 0) {
        return { summary: null, campaigns: [], daily: [], sourceFiles };
    }

    // Overall summary
    const totalSpend = records.reduce((s, r) => s + Number(r.spend), 0);
    const totalRevenue = records.reduce((s, r) => s + Number(r.revenue), 0);
    const totalImpressions = records.reduce((s, r) => s + r.impressions, 0);
    const totalClicks = records.reduce((s, r) => s + r.clicks, 0);
    const totalPurchases = records.reduce((s, r) => s + r.purchases, 0);

    const summary: AdsSummary = {
        totalSpend: Math.round(totalSpend),
        totalRevenue: Math.round(totalRevenue),
        totalImpressions,
        totalClicks,
        totalPurchases,
        overallRoas: totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0,
        cpa: totalPurchases > 0 ? Math.round(totalSpend / totalPurchases) : 0,
        cpc: totalClicks > 0 ? Math.round((totalSpend / totalClicks) * 100) / 100 : 0,
    };

    // By campaign
    const campaignMap = new Map<string, { spend: number; impressions: number; clicks: number; purchases: number; revenue: number }>();
    for (const r of records) {
        const existing = campaignMap.get(r.campaign) ?? { spend: 0, impressions: 0, clicks: 0, purchases: 0, revenue: 0 };
        existing.spend += Number(r.spend);
        existing.impressions += r.impressions;
        existing.clicks += r.clicks;
        existing.purchases += r.purchases;
        existing.revenue += Number(r.revenue);
        campaignMap.set(r.campaign, existing);
    }

    const campaigns: CampaignSummary[] = [...campaignMap.entries()]
        .map(([campaign, data]) => ({
            campaign,
            spend: Math.round(data.spend),
            impressions: data.impressions,
            clicks: data.clicks,
            purchases: data.purchases,
            revenue: Math.round(data.revenue),
            roas: data.spend > 0 ? Math.round((data.revenue / data.spend) * 100) / 100 : 0,
            cpa: data.purchases > 0 ? Math.round(data.spend / data.purchases) : 0,
        }))
        .sort((a, b) => b.spend - a.spend);

    // Daily totals
    const dailyMap = new Map<string, { spend: number; revenue: number }>();
    for (const r of records) {
        const date = r.date.toISOString().split("T")[0];
        const existing = dailyMap.get(date) ?? { spend: 0, revenue: 0 };
        existing.spend += Number(r.spend);
        existing.revenue += Number(r.revenue);
        dailyMap.set(date, existing);
    }

    const daily: DailySpend[] = [...dailyMap.entries()]
        .map(([date, data]) => ({
            date,
            spend: Math.round(data.spend),
            revenue: Math.round(data.revenue),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

    return { summary, campaigns, daily, sourceFiles };
}
