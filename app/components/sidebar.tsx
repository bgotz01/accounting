"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/app/(marketing)/actions";
import { useChatContext } from "@/app/components/chat-context";
import { useMobileMenu } from "@/app/components/mobile-menu-context";

const navItems = [
    {
        label: "Profile",
        href: "/profile",
        icon: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
                <circle cx="9" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3.5 15c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        ),
    },
    {
        label: "Dashboard",
        href: "/dashboard",
        icon: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
                <rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                <rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                <rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                <rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
        ),
    },
    {
        label: "Documents",
        href: "/documents",
        icon: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
                <path d="M4 2.5H11L14 5.5V15.5H4V2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M11 2.5V5.5H14" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M6.5 9.5H11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M6.5 12H9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        ),
    },
    {
        label: "Transactions",
        href: "/transactions",
        icon: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
                <path d="M2 5H16M2 9H16M2 13H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        ),
    },
    {
        label: "Ledger",
        href: "/ledger",
        icon: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
                <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2 7h14" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 7v9" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5 10.5h2M5 13h2M11 10.5h2M11 13h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        ),
    },
    {
        label: "Statements",
        href: "/statements",
        icon: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
                <path d="M3 14V4M7 14V7M11 14V5M15 14V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        ),
    },
    {
        label: "Tax",
        href: "/tax",
        icon: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
                <path d="M4 2.5H11L14 5.5V15.5H4V2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M11 2.5V5.5H14" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M6.5 8.5L11.5 8.5M6.5 11H9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M7 12.5L11 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        ),
    },
    {
        label: "Invoices",
        href: "/invoices",
        icon: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
                <path d="M4 2.5H11L14 5.5V15.5H4V2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M11 2.5V5.5H14" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M6.5 9.5H11.5M6.5 12H9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="13" cy="13" r="3" fill="white" stroke="currentColor" strokeWidth="1.5" className="dark:fill-zinc-900" />
                <path d="M13 11.5v1.5l1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
    {
        label: "Ads",
        href: "/ads",
        icon: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
                <path d="M2 14L6 10L9 12L16 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 4H16V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
];

const chatIcon = (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
        <path d="M3 13.5L3 4.5C3 3.67157 3.67157 3 4.5 3H13.5C14.3284 3 15 3.67157 15 4.5V10.5C15 11.3284 14.3284 12 13.5 12H6L3 13.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M6.5 7H11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M6.5 9.5H9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

type Conversation = { id: string; title: string; updatedAt: string };

function SidebarContent({
    pathname,
    collapsed,
    chatExpanded,
    setChatExpanded,
    conversations,
    openConversation,
    toggleCollapsed,
    userEmail,
    onNavClick,
}: {
    pathname: string;
    collapsed: boolean;
    chatExpanded: boolean;
    setChatExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
    conversations: Conversation[];
    openConversation: (id: string) => void;
    toggleCollapsed: () => void;
    userEmail: string;
    onNavClick?: () => void;
}) {
    const isChatActive = pathname === "/chat";

    return (
        <>
            <nav className="flex flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto px-2 py-4">
                {/* Collapse toggle — desktop only, at the top */}
                <button
                    onClick={toggleCollapsed}
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    className="mb-2 hidden items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 md:flex dark:text-zinc-500 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-300"
                >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={`shrink-0 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}>
                        <path d="M7 4L3 9L7 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M3 9H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M15 4V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    {!collapsed && <span>Collapse</span>}
                </button>

                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={collapsed ? item.label : undefined}
                            onClick={onNavClick}
                            className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${isActive
                                ? "bg-zinc-200/70 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200"
                                }`}
                        >
                            {item.icon}
                            {!collapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                    );
                })}

                {/* Chat section */}
                <div>
                    <div className="flex items-center">
                        <Link
                            href="/chat"
                            title={collapsed ? "Chat" : undefined}
                            onClick={onNavClick}
                            className={`flex flex-1 items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${isChatActive
                                ? "bg-zinc-200/70 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200"
                                }`}
                        >
                            {chatIcon}
                            {!collapsed && <span className="truncate">Chat</span>}
                        </Link>
                        {!collapsed && (
                            <button
                                onClick={() => setChatExpanded((v) => !v)}
                                className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                                aria-label={chatExpanded ? "Collapse chats" : "Expand chats"}
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`transition-transform ${chatExpanded ? "rotate-180" : ""}`}>
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {chatExpanded && !collapsed && (
                        <div className="ml-3 mt-0.5 border-l border-zinc-200 pl-3 dark:border-zinc-700">
                            {conversations.length === 0 ? (
                                <p className="py-2 text-xs text-zinc-400 dark:text-zinc-500">No saved chats yet</p>
                            ) : (
                                <div className="space-y-0.5 py-1">
                                    {conversations.map((c) => (
                                        <button
                                            key={c.id}
                                            onClick={() => { openConversation(c.id); onNavClick?.(); }}
                                            className="block w-full truncate rounded-md px-2 py-1.5 text-left text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                                            title={c.title}
                                        >
                                            {c.title}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </nav>

            {/* User section */}
            <div className="border-t border-zinc-200 px-2 py-3 dark:border-zinc-800">
                <div className={`flex items-center rounded-lg px-2.5 py-2 ${collapsed ? "justify-center" : "justify-between"}`}>
                    {!collapsed && (
                        <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">{userEmail}</span>
                    )}
                    <form action={logout}>
                        <button
                            type="submit"
                            title={collapsed ? "Log out" : undefined}
                            className="text-xs text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                        >
                            {collapsed ? (
                                <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                                    <path d="M7 3H3.5C3 3 2.5 3.5 2.5 4v10c0 .5.5 1 1 1H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    <path d="M12 12l3-3-3-3M15 9H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : (
                                "Log out"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}

export function Sidebar({ userEmail }: { userEmail: string }) {
    const pathname = usePathname();
    const { openConversation } = useChatContext();
    const { mobileOpen, setMobileOpen } = useMobileMenu();
    const [chatExpanded, setChatExpanded] = useState(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [collapsed, setCollapsed] = useState(false);

    // Persist collapsed state across navigation
    useEffect(() => {
        const stored = localStorage.getItem("sidebar-collapsed");
        if (stored === "true") setCollapsed(true);
    }, []);

    // Close mobile drawer on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Prevent body scroll when mobile drawer is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [mobileOpen]);

    const toggleCollapsed = () => {
        setCollapsed((v) => {
            const next = !v;
            localStorage.setItem("sidebar-collapsed", String(next));
            if (next) setChatExpanded(false);
            return next;
        });
    };

    useEffect(() => {
        if (!chatExpanded) return;
        fetch("/api/chat/conversations")
            .then((r) => r.json())
            .then((data: Conversation[]) => setConversations(data))
            .catch(() => { });
    }, [chatExpanded]);

    useEffect(() => {
        if (pathname === "/chat") setChatExpanded(true);
    }, [pathname]);

    const sharedProps = {
        pathname,
        chatExpanded,
        setChatExpanded,
        conversations,
        openConversation,
        toggleCollapsed,
        userEmail,
    };

    return (
        <>
            {/* ── Mobile open tab — fixed below navbar, left edge ── */}
            {!mobileOpen && (
                <button
                    onClick={() => setMobileOpen(true)}
                    aria-label="Open menu"
                    className="fixed left-0 top-14 z-40 rounded-r-lg border border-l-0 border-zinc-200 bg-white px-1 py-3 shadow-sm md:hidden dark:border-zinc-700 dark:bg-zinc-900"
                >
                    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" className="text-zinc-500 dark:text-zinc-400">
                        <path d="M4 5h10M4 9h10M4 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </button>
            )}

            {/* ── Mobile backdrop ── */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* ── Mobile drawer ── */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 bg-zinc-50 transition-transform duration-200 md:hidden dark:border-zinc-800 dark:bg-zinc-900 ${mobileOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                {/* Close button */}
                <button
                    onClick={() => setMobileOpen(false)}
                    aria-label="Close menu"
                    className="absolute right-3 top-3 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </button>
                <SidebarContent
                    {...sharedProps}
                    collapsed={false}
                    onNavClick={() => setMobileOpen(false)}
                />
            </aside>

            {/* ── Desktop sidebar ── */}
            <aside
                className={`hidden flex-col border-r border-zinc-200 bg-zinc-50/50 transition-[width] duration-200 ease-in-out md:flex dark:border-zinc-800 dark:bg-zinc-900/50 ${collapsed ? "w-[52px]" : "w-60"
                    }`}
            >
                <SidebarContent
                    {...sharedProps}
                    collapsed={collapsed}
                />
            </aside>
        </>
    );
}
