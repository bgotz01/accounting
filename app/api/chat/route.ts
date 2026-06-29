import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { streamText } from "ai";
import { getModel, resolveApiKey } from "@/app/lib/ai-client";

export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { messages, page } = (await request.json()) as {
        messages: { role: "user" | "assistant"; content: string }[];
        page?: string;
    };

    // Resolve the user's API key (personal key takes priority over env)
    const userRecord = await prisma.user.findUnique({
        where: { id: user.id },
        select: { aiApiKey: true },
    });
    let model;
    try {
        const apiKey = await resolveApiKey(userRecord?.aiApiKey);
        model = getModel(apiKey, "standard");
    } catch {
        return new Response("No API key configured.", { status: 400 });
    }

    // Always fetch transaction summary (core financial data)
    const transactions = await prisma.transaction.findMany({
        where: { userId: user.id },
        orderBy: { date: "desc" },
    });

    const totalIncome = transactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const netCashFlow = totalIncome - totalExpenses;

    // Build category breakdown
    const expenseMap = new Map<string, number>();
    transactions
        .filter((t) => t.type === "expense")
        .forEach((t) => {
            const cat = t.financialCategory || "other";
            expenseMap.set(cat, (expenseMap.get(cat) || 0) + Number(t.amount));
        });

    const categoryBreakdown = [...expenseMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amt]) => `  ${cat}: $${amt.toFixed(2)}`)
        .join("\n");

    // Build page-specific context
    let pageSpecificData = "";

    if (page === "/ads") {
        const adRecords = await prisma.adSpend.findMany({
            where: { userId: user.id },
            orderBy: { date: "desc" },
        });

        if (adRecords.length > 0) {
            const totalSpend = adRecords.reduce((s, r) => s + Number(r.spend), 0);
            const totalAdRevenue = adRecords.reduce((s, r) => s + Number(r.revenue), 0);
            const totalImpressions = adRecords.reduce((s, r) => s + r.impressions, 0);
            const totalClicks = adRecords.reduce((s, r) => s + r.clicks, 0);
            const totalPurchases = adRecords.reduce((s, r) => s + r.purchases, 0);
            const roas = totalSpend > 0 ? (totalAdRevenue / totalSpend).toFixed(2) : "N/A";
            const cpa = totalPurchases > 0 ? (totalSpend / totalPurchases).toFixed(2) : "N/A";
            const cpc = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : "N/A";

            // Campaign breakdown
            const campaignMap = new Map<string, { spend: number; impressions: number; clicks: number; purchases: number; revenue: number }>();
            for (const r of adRecords) {
                const existing = campaignMap.get(r.campaign) ?? { spend: 0, impressions: 0, clicks: 0, purchases: 0, revenue: 0 };
                existing.spend += Number(r.spend);
                existing.impressions += r.impressions;
                existing.clicks += r.clicks;
                existing.purchases += r.purchases;
                existing.revenue += Number(r.revenue);
                campaignMap.set(r.campaign, existing);
            }

            const campaignBreakdown = [...campaignMap.entries()]
                .sort((a, b) => b[1].spend - a[1].spend)
                .map(([name, d]) => ({
                    campaign: name,
                    spend: Math.round(d.spend),
                    revenue: Math.round(d.revenue),
                    roas: d.spend > 0 ? (d.revenue / d.spend).toFixed(2) : "0",
                    impressions: d.impressions,
                    clicks: d.clicks,
                    purchases: d.purchases,
                    cpa: d.purchases > 0 ? Math.round(d.spend / d.purchases) : null,
                }));

            pageSpecificData = `
The user is on the ADS page. Here is their advertising data:

Ad Performance Summary:
- Total Ad Spend: $${totalSpend.toFixed(2)}
- Total Ad Revenue: $${totalAdRevenue.toFixed(2)}
- ROAS (Return on Ad Spend): ${roas}x
- Total Impressions: ${totalImpressions.toLocaleString()}
- Total Clicks: ${totalClicks.toLocaleString()}
- Total Purchases: ${totalPurchases.toLocaleString()}
- CPA (Cost per Acquisition): $${cpa}
- CPC (Cost per Click): $${cpc}
- Total Ad Records: ${adRecords.length}

Campaign Breakdown:
${JSON.stringify(campaignBreakdown, null, 2)}

Focus your answers on advertising performance, ROAS, campaign optimization, and ad spend efficiency.`;
        } else {
            pageSpecificData = `The user is on the ADS page but has no advertising data uploaded yet.`;
        }
    } else if (page === "/transactions") {
        // Include more transaction detail
        const recentDetailed = transactions.slice(0, 50).map((t) => ({
            date: t.date.toISOString().split("T")[0],
            description: t.description,
            counterparty: t.counterparty,
            amount: Number(t.amount),
            type: t.type,
            category: t.financialCategory || "uncategorized",
        }));

        pageSpecificData = `
The user is on the TRANSACTIONS page. They can see all ${transactions.length} transactions with filtering and category assignment.

Income transactions: ${transactions.filter((t) => t.type === "income").length}
Expense transactions: ${transactions.filter((t) => t.type === "expense").length}

Most recent 50 transactions:
${JSON.stringify(recentDetailed, null, 2)}

Focus your answers on transaction patterns, categorization, and specific transaction details.`;
    } else if (page === "/statements") {
        // Build income statement data
        const monthlyMap = new Map<string, { revenue: number; expenses: number; net: number; count: number }>();
        for (const t of transactions) {
            const date = new Date(t.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            const existing = monthlyMap.get(key) ?? { revenue: 0, expenses: 0, net: 0, count: 0 };
            const amount = Number(t.amount);
            if (t.type === "income") {
                existing.revenue += amount;
            } else {
                existing.expenses += amount;
            }
            existing.net = existing.revenue - existing.expenses;
            existing.count++;
            monthlyMap.set(key, existing);
        }

        const monthlyStatements = [...monthlyMap.entries()]
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([period, data]) => ({ period, ...data }));

        pageSpecificData = `
The user is on the STATEMENTS page, which shows income statements grouped by period.

Monthly Income Statements:
${JSON.stringify(monthlyStatements, null, 2)}

Focus your answers on period-over-period trends, profitability, and financial health over time.`;
    } else if (page === "/documents") {
        const files = await prisma.file.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
        });

        const fileList = files.map((f) => ({
            filename: f.filename,
            type: f.fileType,
            category: f.category,
            status: f.processingStatus,
            uploaded: f.createdAt.toISOString().split("T")[0],
        }));

        pageSpecificData = `
The user is on the DOCUMENTS page, which shows all uploaded files.

Uploaded Files (${files.length} total):
${JSON.stringify(fileList, null, 2)}

Focus your answers on document status, processing, and what data has been imported.`;
    } else if (page === "/dashboard") {
        pageSpecificData = `
The user is on the DASHBOARD page, which shows an overview of income, expenses, net cash flow, and expense breakdown by category.

Focus your answers on high-level financial health, key metrics, and actionable insights.`;
    } else if (page === "/upload") {
        pageSpecificData = `
The user is on the UPLOAD page, where they upload bank statements and financial documents for processing.

Focus your answers on helping with uploads, supported file formats, and what to expect after uploading.`;
    }

    // Recent transactions (always included as baseline context)
    const recentTxns = transactions.slice(0, 30).map((t) => ({
        date: t.date.toISOString().split("T")[0],
        description: t.description,
        amount: Number(t.amount),
        type: t.type,
        category: t.financialCategory || "uncategorized",
    }));

    const systemPrompt = `You are a helpful financial assistant for a small business owner. You have access to their financial data and should provide clear, actionable insights.

Here is a summary of their financial data:
- Total Income: $${totalIncome.toFixed(2)}
- Total Expenses: $${totalExpenses.toFixed(2)}
- Net Cash Flow: $${netCashFlow.toFixed(2)}
- Total Transactions: ${transactions.length}

Expense breakdown by category:
${categoryBreakdown || "  No expenses recorded yet."}

Recent transactions (most recent 30):
${recentTxns.length > 0 ? JSON.stringify(recentTxns, null, 2) : "No transactions recorded yet."}
${pageSpecificData}

Guidelines:
- Be concise and direct
- Use dollar amounts when discussing finances
- If the user has no data yet, let them know they should upload some financial documents first
- Provide actionable recommendations when appropriate
- Format responses with markdown for readability`;

    const result = streamText({
        model,
        messages: [
            { role: "system", content: systemPrompt },
            ...messages,
        ],
    });

    return result.toTextStreamResponse();
}
