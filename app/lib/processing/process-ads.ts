import { prisma } from "@/app/lib/prisma";
import type { RawRow } from "./parse-file";

/**
 * Import ads/marketing report data into the ad_spend table.
 * Expects columns like: date, campaign, spend, impressions, clicks, purchases, revenue, roas
 */
export async function processAdsData(
    fileId: string,
    userId: string,
    rows: RawRow[],
    headers: string[]
) {
    const lower = headers.map((h) => h.toLowerCase().trim());

    // Find columns
    const dateIdx = lower.findIndex((h) => ["date"].includes(h));
    const campaignIdx = lower.findIndex((h) => ["campaign", "campaign_name", "ad_set", "adset"].includes(h));
    const spendIdx = lower.findIndex((h) => ["spend", "cost", "amount_spent"].includes(h));
    const impressionsIdx = lower.findIndex((h) => ["impressions", "impr"].includes(h));
    const clicksIdx = lower.findIndex((h) => ["clicks", "link_clicks"].includes(h));
    const purchasesIdx = lower.findIndex((h) => ["purchases", "conversions", "results"].includes(h));
    const revenueIdx = lower.findIndex((h) => ["revenue", "purchase_value", "conversion_value"].includes(h));
    const roasIdx = lower.findIndex((h) => ["roas", "return_on_ad_spend"].includes(h));

    if (dateIdx === -1 || spendIdx === -1) {
        throw new Error("Ads data must have at least 'date' and 'spend' columns");
    }

    const records = [];

    for (const row of rows) {
        const values = Object.values(row);
        const dateStr = values[dateIdx]?.trim();
        const spendStr = values[spendIdx]?.trim();

        if (!dateStr || !spendStr) continue;

        const spend = parseFloat(spendStr.replace(/[,$]/g, ""));
        if (isNaN(spend) || spend === 0) continue;

        const campaign = campaignIdx >= 0 ? values[campaignIdx]?.trim() || "Unknown" : "Unknown";
        const impressions = impressionsIdx >= 0 ? parseInt(values[impressionsIdx] || "0") || 0 : 0;
        const clicks = clicksIdx >= 0 ? parseInt(values[clicksIdx] || "0") || 0 : 0;
        const purchases = purchasesIdx >= 0 ? parseInt(values[purchasesIdx] || "0") || 0 : 0;
        const revenue = revenueIdx >= 0 ? parseFloat(values[revenueIdx]?.replace(/[,$]/g, "") || "0") || 0 : 0;
        const roas = roasIdx >= 0 ? parseFloat(values[roasIdx] || "0") || null : null;

        records.push({
            userId,
            fileId,
            date: new Date(dateStr),
            platform: "meta", // TODO: detect platform from filename or column
            campaign,
            spend,
            impressions,
            clicks,
            purchases,
            revenue,
            roas,
        });
    }

    if (records.length > 0) {
        await prisma.adSpend.createMany({ data: records });
    }

    return { recordCount: records.length };
}
