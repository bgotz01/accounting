import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPEN_AI_API });

export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { messages } = (await request.json()) as {
        messages: { role: "user" | "assistant"; content: string }[];
    };

    // Fetch ALL user transactions so totals match what they see in the app
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

    // Recent transactions for context
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

Guidelines:
- Be concise and direct
- Use dollar amounts when discussing finances
- If the user has no data yet, let them know they should upload some financial documents first
- Provide actionable recommendations when appropriate
- Format responses with markdown for readability`;

    const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: systemPrompt },
            ...messages,
        ],
        stream: true,
    });

    // Return a streaming response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
        async start(controller) {
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                    controller.enqueue(encoder.encode(content));
                }
            }
            controller.close();
        },
    });

    return new Response(readable, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Transfer-Encoding": "chunked",
        },
    });
}
