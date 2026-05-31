import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";

// GET — list all conversations for the user
export async function GET() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return new Response("Unauthorized", { status: 401 });
    }

    const conversations = await prisma.chatConversation.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, updatedAt: true },
    });

    return Response.json(conversations);
}

// POST — create a new conversation
export async function POST(request: Request) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { title, messages } = (await request.json()) as {
        title?: string;
        messages?: { role: string; content: string }[];
    };

    const conversation = await prisma.chatConversation.create({
        data: {
            userId: user.id,
            title: title || "New chat",
            messages: messages || [],
        },
    });

    return Response.json(conversation);
}
