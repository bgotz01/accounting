import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";

// GET — load a single conversation
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const conversation = await prisma.chatConversation.findFirst({
        where: { id, userId: user.id },
    });

    if (!conversation) {
        return new Response("Not found", { status: 404 });
    }

    return Response.json(conversation);
}

// PUT — update conversation (title + messages)
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const { title, messages } = (await request.json()) as {
        title?: string;
        messages?: { role: string; content: string }[];
    };

    const data: { title?: string; messages?: { role: string; content: string }[] } = {};
    if (title !== undefined) data.title = title;
    if (messages !== undefined) data.messages = messages;

    const conversation = await prisma.chatConversation.updateMany({
        where: { id, userId: user.id },
        data,
    });

    if (conversation.count === 0) {
        return new Response("Not found", { status: 404 });
    }

    return Response.json({ success: true });
}

// DELETE — remove a conversation
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    await prisma.chatConversation.deleteMany({
        where: { id, userId: user.id },
    });

    return Response.json({ success: true });
}
