"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Markdown } from "@/app/components/markdown";

type Message = {
    role: "user" | "assistant";
    content: string;
};

type ChatTab = {
    id: string;
    title: string;
    messages: Message[];
};

const SUGGESTIONS = [
    "What should I worry about?",
    "Why did expenses rise this month?",
    "How long is my runway?",
    "Which customer is most important?",
];

let nextTabId = 1;

function createTab(): ChatTab {
    const id = `tab-${nextTabId++}`;
    return { id, title: "New chat", messages: [] };
}

export default function ChatPage() {
    const pathname = usePathname();
    const [tabs, setTabs] = useState<ChatTab[]>(() => [createTab()]);
    const [activeTabId, setActiveTabId] = useState(tabs[0].id);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [activeTab.messages]);

    const updateTabMessages = useCallback(
        (tabId: string, updater: (msgs: Message[]) => Message[]) => {
            setTabs((prev) =>
                prev.map((t) =>
                    t.id === tabId ? { ...t, messages: updater(t.messages) } : t
                )
            );
        },
        []
    );

    const updateTabTitle = useCallback((tabId: string, title: string) => {
        setTabs((prev) =>
            prev.map((t) => (t.id === tabId ? { ...t, title } : t))
        );
    }, []);

    async function sendMessage(content: string) {
        if (!content.trim() || isLoading) return;

        const userMessage: Message = { role: "user", content: content.trim() };
        const tabId = activeTabId;

        // Set title from first message
        if (activeTab.messages.length === 0) {
            const title =
                content.trim().length > 30
                    ? content.trim().slice(0, 30) + "…"
                    : content.trim();
            updateTabTitle(tabId, title);
        }

        const updatedMessages = [...activeTab.messages, userMessage];
        updateTabMessages(tabId, () => updatedMessages);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: updatedMessages, page: pathname }),
            });

            if (!response.ok) throw new Error("Failed to get response");

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No reader available");

            const decoder = new TextDecoder();
            let assistantContent = "";

            updateTabMessages(tabId, (msgs) => [
                ...msgs,
                { role: "assistant", content: "" },
            ]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                assistantContent += decoder.decode(value, { stream: true });
                const captured = assistantContent;
                updateTabMessages(tabId, (msgs) => {
                    const updated = [...msgs];
                    updated[updated.length - 1] = {
                        role: "assistant",
                        content: captured,
                    };
                    return updated;
                });
            }
        } catch {
            updateTabMessages(tabId, (msgs) => [
                ...msgs,
                {
                    role: "assistant",
                    content: "Sorry, I encountered an error. Please try again.",
                },
            ]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        sendMessage(input);
    }

    function addTab() {
        const tab = createTab();
        setTabs((prev) => [...prev, tab]);
        setActiveTabId(tab.id);
        setInput("");
    }

    function closeTab(tabId: string) {
        setTabs((prev) => {
            const remaining = prev.filter((t) => t.id !== tabId);
            if (remaining.length === 0) {
                const newTab = createTab();
                setActiveTabId(newTab.id);
                return [newTab];
            }
            if (activeTabId === tabId) {
                setActiveTabId(remaining[remaining.length - 1].id);
            }
            return remaining;
        });
    }

    return (
        <div className="mx-auto flex h-full max-w-3xl flex-col">
            {/* Header */}
            <div className="mb-4">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Ask AI
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Ask anything about your business data
                </p>
            </div>

            {/* Tab bar */}
            <div className="flex items-end gap-0.5 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTabId(tab.id)}
                            className={`group flex min-w-0 max-w-[180px] items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-2 text-xs font-medium transition-colors ${tab.id === activeTabId
                                ? "border-zinc-200 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                                : "border-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                                }`}
                        >
                            <span className="truncate">{tab.title}</span>
                            {tabs.length > 1 && (
                                <span
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeTab(tab.id);
                                    }}
                                    className="ml-auto flex-shrink-0 rounded p-0.5 text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-200 hover:text-zinc-600 group-hover:opacity-100 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <path d="M18 6L6 18M6 6l12 12" />
                                    </svg>
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                <button
                    onClick={addTab}
                    className="mb-0.5 flex-shrink-0 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                    aria-label="New chat"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                </button>
            </div>

            {/* Chat area */}
            <div className="flex flex-1 flex-col overflow-hidden rounded-b-xl border border-t-0 border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/30">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {activeTab.messages.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center">
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
                                Upload some financial data first, then ask
                                questions like:
                            </p>
                            <div className="mt-4 space-y-2">
                                {SUGGESTIONS.map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => sendMessage(q)}
                                        className="block w-full cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-left text-sm text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-700"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activeTab.messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${msg.role === "user"
                                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                                            : "bg-zinc-50 text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700"
                                            }`}
                                    >
                                        <div className="whitespace-pre-wrap">
                                            {msg.role === "assistant" ? (
                                                <Markdown content={msg.content} />
                                            ) : (
                                                msg.content
                                            )}
                                            {isLoading &&
                                                i === activeTab.messages.length - 1 &&
                                                msg.role === "assistant" &&
                                                msg.content === "" && (
                                                    <span className="inline-block animate-pulse">
                                                        Thinking...
                                                    </span>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>
            </div>

            {/* Input area */}
            <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about your business..."
                    className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                >
                    Send
                </button>
            </form>
        </div>
    );
}
