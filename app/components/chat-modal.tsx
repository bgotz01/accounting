"use client";

import { useState, useRef, useEffect } from "react";
import { Markdown } from "@/app/components/markdown";

type Message = {
    role: "user" | "assistant";
    content: string;
};

const SUGGESTIONS = [
    "What should I worry about?",
    "Why did expenses rise this month?",
    "How long is my runway?",
];

export function ChatModal() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    async function sendMessage(content: string) {
        if (!content.trim() || isLoading) return;

        const userMessage: Message = { role: "user", content: content.trim() };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: updatedMessages }),
            });

            if (!response.ok) throw new Error("Failed to get response");

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No reader available");

            const decoder = new TextDecoder();
            let assistantContent = "";

            setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                assistantContent += decoder.decode(value, { stream: true });
                setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                        role: "assistant",
                        content: assistantContent,
                    };
                    return updated;
                });
            }
        } catch {
            setMessages((prev) => [
                ...prev,
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

    return (
        <>
            {/* Floating trigger button */}
            <button
                onClick={() => setOpen(!open)}
                className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 dark:bg-white dark:text-zinc-900"
                aria-label={open ? "Close chat" : "Open chat"}
            >
                {open ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                        <path d="M12 3L14 8.5L20 12L14 15.5L12 21L10 15.5L4 12L10 8.5L12 3Z" />
                    </svg>
                )}
            </button>

            {/* Modal panel */}
            {open && (
                <div className="fixed bottom-20 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-zinc-500 dark:text-zinc-400" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                                    <path d="M12 3L14 8.5L20 12L14 15.5L12 21L10 15.5L4 12L10 8.5L12 3Z" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                Ask AI
                            </span>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {messages.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center">
                                <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                                    Ask anything about your business data
                                </p>
                                <div className="mt-3 space-y-1.5">
                                    {SUGGESTIONS.map((q) => (
                                        <button
                                            key={q}
                                            onClick={() => sendMessage(q)}
                                            className="block w-full cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-left text-xs text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {messages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${msg.role === "user"
                                                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                                                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                                                }`}
                                        >
                                            <div className="whitespace-pre-wrap">
                                                {msg.role === "assistant" ? (
                                                    <Markdown content={msg.content} />
                                                ) : (
                                                    msg.content
                                                )}
                                                {isLoading &&
                                                    i === messages.length - 1 &&
                                                    msg.role === "assistant" &&
                                                    msg.content === "" && (
                                                        <span className="animate-pulse">
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

                    {/* Input */}
                    <form
                        onSubmit={handleSubmit}
                        className="flex gap-2 border-t border-zinc-100 px-3 py-3 dark:border-zinc-800"
                    >
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about your business..."
                            className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition-opacity disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                        >
                            Send
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}
