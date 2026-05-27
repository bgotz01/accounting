"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(marketing)/actions";

const navItems = [
    {
        label: "Dashboard",
        href: "/dashboard",
        icon: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect
                    x="2"
                    y="2"
                    width="6"
                    height="6"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
                <rect
                    x="10"
                    y="2"
                    width="6"
                    height="6"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
                <rect
                    x="2"
                    y="10"
                    width="6"
                    height="6"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
                <rect
                    x="10"
                    y="10"
                    width="6"
                    height="6"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
            </svg>
        ),
    },
    {
        label: "Documents",
        href: "/documents",
        icon: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                    d="M4 2.5H11L14 5.5V15.5H4V2.5Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
                <path
                    d="M11 2.5V5.5H14"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
                <path
                    d="M6.5 9.5H11.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
                <path
                    d="M6.5 12H9.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
            </svg>
        ),
    },
    {
        label: "Transactions",
        href: "/transactions",
        icon: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                    d="M2 5H16M2 9H16M2 13H12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
            </svg>
        ),
    },
    {
        label: "Statements",
        href: "/statements",
        icon: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                    d="M3 14V4M7 14V7M11 14V5M15 14V2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
            </svg>
        ),
    },
    {
        label: "Ask AI",
        href: "/chat",
        icon: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                    d="M3 13.5L3 4.5C3 3.67157 3.67157 3 4.5 3H13.5C14.3284 3 15 3.67157 15 4.5V10.5C15 11.3284 14.3284 12 13.5 12H6L3 13.5Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
                <path
                    d="M6.5 7H11.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
                <path
                    d="M6.5 9.5H9.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />
            </svg>
        ),
    },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
    const pathname = usePathname();

    return (
        <aside className="flex w-60 flex-col border-r border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
            {/* Navigation */}
            <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive
                                ? "bg-zinc-200/70 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200"
                                }`}
                        >
                            {item.icon}
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* User section */}
            <div className="border-t border-zinc-200 px-3 py-3 dark:border-zinc-800">
                <div className="flex items-center justify-between rounded-lg px-3 py-2">
                    <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {userEmail}
                    </span>
                    <form action={logout}>
                        <button
                            type="submit"
                            className="text-xs text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                        >
                            Log out
                        </button>
                    </form>
                </div>
            </div>
        </aside>
    );
}
