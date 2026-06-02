import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { Sidebar } from "@/app/components/sidebar";
import { ChatPanel } from "@/app/components/chat-panel";
import { ChatProvider } from "@/app/components/chat-context";
import { CurrencyProvider } from "@/app/components/currency-context";

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Ensure user exists in our database (only on first visit per server lifecycle)
    const userSynced = (globalThis as any).__userSynced as Set<string> | undefined;
    const syncedSet = userSynced ?? new Set<string>();
    if (!userSynced) (globalThis as any).__userSynced = syncedSet;

    if (!syncedSet.has(user.id)) {
        syncedSet.add(user.id);
        prisma.user.upsert({
            where: { id: user.id },
            update: {},
            create: {
                id: user.id,
                email: user.email ?? "",
            },
        }).catch(() => { });
    }

    // Fetch business profile for currency preference
    const businessProfile = await prisma.businessProfile.findUnique({
        where: { userId: user.id },
        select: { currency: true },
    }).catch(() => null);

    const currency = businessProfile?.currency ?? "USD";

    return (
        <ChatProvider>
            <CurrencyProvider currency={currency}>
                <div className="flex flex-1">
                    <Sidebar userEmail={user.email ?? ""} />
                    <div className="flex flex-1 flex-col overflow-hidden">
                        <ChatPanel />
                        <div className="flex-1 overflow-y-auto px-4 py-6 pt-6 sm:px-6 sm:py-8 md:px-8">{children}</div>
                    </div>
                </div>
            </CurrencyProvider>
        </ChatProvider>
    );
}
