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
    let user = null;
    let currency = "USD";

    try {
        const supabase = await createClient();
        const {
            data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
            redirect("/login");
        }

        user = authUser;

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
            }).catch(() => {});
        }

        // Fetch business profile for currency preference
        const businessProfile = await prisma.businessProfile.findUnique({
            where: { userId: user.id },
            select: { currency: true },
        }).catch(() => null);

        currency = businessProfile?.currency ?? "USD";
    } catch (error) {
        console.error("Supabase auth unavailable:", error);
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12 dark:bg-zinc-950">
                <div className="max-w-xl rounded-3xl border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
                        Authentication service unavailable
                    </h1>
                    <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                        We couldn’t verify your session right now. Please try again in a few
                        moments, or return to the public homepage.
                    </p>
                    <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <a
                            href="/login"
                            className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                            Retry login
                        </a>
                        <a
                            href="/"
                            className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-200 px-6 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            Return home
                        </a>
                    </div>
                </div>
            </div>
        );
    }

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
