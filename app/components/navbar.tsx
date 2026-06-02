import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import { logout } from "@/app/(marketing)/actions";

export default async function Navbar() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return (
        <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
            <nav className="flex h-14 w-full items-center justify-between px-4 sm:px-6">
                <Link href="/" className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 dark:bg-white">
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            className="text-white dark:text-zinc-900"
                        >
                            <path
                                d="M2 7C2 4.23858 4.23858 2 7 2C9.76142 2 12 4.23858 12 7C12 9.76142 9.76142 12 7 12"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                            <path
                                d="M7 5V9M5 7H9"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>
                    <span className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                        CountFlow
                    </span>
                </Link>

                <div className="flex items-center gap-1">
                    <Link
                        href="/dashboard"
                        className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:block dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                        Dashboard
                    </Link>
                    <Link
                        href="/upload"
                        className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:block dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                        Upload
                    </Link>
                    <Link
                        href="/chat"
                        className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:block dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                        Chat
                    </Link>
                    <div className="ml-3 hidden h-5 w-px bg-zinc-200 sm:block dark:bg-zinc-700" />
                    {user ? (
                        <div className="ml-1 flex items-center gap-2 sm:ml-3 sm:gap-3">
                            <span className="hidden text-sm text-zinc-700 sm:block dark:text-zinc-300">
                                {user.user_metadata?.full_name || user.email}
                            </span>
                            <form action={logout}>
                                <button
                                    type="submit"
                                    className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                                >
                                    Sign out
                                </button>
                            </form>
                        </div>
                    ) : (
                        <Link
                            href="/login"
                            className="ml-3 rounded-md bg-zinc-900 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                            Sign in
                        </Link>
                    )}
                </div>
            </nav>
        </header>
    );
}
