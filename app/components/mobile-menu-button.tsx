"use client";

import { useMobileMenu } from "./mobile-menu-context";

export function MobileMenuButton() {
    const { setMobileOpen } = useMobileMenu();
    return (
        <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="flex items-center justify-center rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 md:hidden dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2.5 5h13M2.5 9h13M2.5 13h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        </button>
    );
}
