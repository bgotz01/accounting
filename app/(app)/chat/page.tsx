export default function ChatPage() {
    return (
        <div className="mx-auto flex h-full max-w-3xl flex-col">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Ask AI
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Ask anything about your business data
                </p>
            </div>

            {/* Chat area */}
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50/50 p-8 dark:border-zinc-800 dark:bg-zinc-900/30">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="text-zinc-400 dark:text-zinc-500"
                    >
                        <path
                            d="M12 3L14 8.5L20 12L14 15.5L12 21L10 15.5L4 12L10 8.5L12 3Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
                <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
                    Upload some financial data first, then ask questions like:
                </p>
                <div className="mt-4 space-y-2">
                    {[
                        "What should I worry about?",
                        "Why did expenses rise this month?",
                        "How long is my runway?",
                        "Which customer is most important?",
                    ].map((q) => (
                        <div
                            key={q}
                            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                            {q}
                        </div>
                    ))}
                </div>
            </div>

            {/* Input area */}
            <div className="mt-4 flex gap-2">
                <input
                    type="text"
                    placeholder="Ask about your business..."
                    className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                    disabled
                />
                <button
                    disabled
                    className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white opacity-50 dark:bg-white dark:text-zinc-900"
                >
                    Send
                </button>
            </div>
        </div>
    );
}
