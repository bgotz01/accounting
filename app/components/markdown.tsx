"use client";

import ReactMarkdown from "react-markdown";

export function Markdown({ content }: { content: string }) {
    return (
        <ReactMarkdown
            components={{
                h1: ({ children }) => (
                    <h1 className="mb-2 mt-3 text-base font-bold first:mt-0">{children}</h1>
                ),
                h2: ({ children }) => (
                    <h2 className="mb-2 mt-3 text-sm font-bold first:mt-0">{children}</h2>
                ),
                h3: ({ children }) => (
                    <h3 className="mb-1.5 mt-2.5 text-sm font-semibold first:mt-0">{children}</h3>
                ),
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => (
                    <strong className="font-semibold">{children}</strong>
                ),
                ul: ({ children }) => (
                    <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>
                ),
                ol: ({ children }) => (
                    <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>
                ),
                li: ({ children }) => <li>{children}</li>,
                code: ({ children }) => (
                    <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-700">
                        {children}
                    </code>
                ),
                pre: ({ children }) => (
                    <pre className="mb-2 overflow-x-auto rounded-md bg-zinc-100 p-3 text-xs last:mb-0 dark:bg-zinc-700">
                        {children}
                    </pre>
                ),
                hr: () => (
                    <hr className="my-3 border-zinc-200 dark:border-zinc-700" />
                ),
            }}
        >
            {content}
        </ReactMarkdown>
    );
}
