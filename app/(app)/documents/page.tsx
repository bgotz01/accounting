"use client";

import { useEffect, useState, useCallback } from "react";
import { getAllFiles, getFileDownloadUrl, getFilePreviewContent } from "./actions";
import { processFileAction } from "./process-action";

const CATEGORY_LABELS: Record<string, string> = {
    bank_statements: "Bank Statements",
    invoices: "Invoices",
    receipts: "Receipts",
    tax_documents: "Tax Documents",
    payroll: "Payroll",
    other: "Other",
};

type FileRecord = {
    id: string;
    filename: string;
    fileType: string;
    category: string;
    period: string | null;
    processingStatus: string;
    createdAt: Date;
};

export default function DocumentsPage() {
    const [files, setFiles] = useState<FileRecord[]>([]);
    const [filterCategory, setFilterCategory] = useState<string | null>(null);
    const [previewFile, setPreviewFile] = useState<{
        content: string;
        filename: string;
        totalLines: number;
    } | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);

    useEffect(() => {
        getAllFiles().then(setFiles);
    }, []);

    const filteredFiles = filterCategory
        ? files.filter((f) => f.category === filterCategory)
        : files;

    const categories = [...new Set(files.map((f) => f.category))];

    const handleDownload = useCallback(async (fileId: string) => {
        const result = await getFileDownloadUrl(fileId);
        if (result.url) {
            window.open(result.url, "_blank");
        }
    }, []);

    const handleProcess = useCallback(async (fileId: string) => {
        // Optimistically update status
        setFiles((prev) =>
            prev.map((f) =>
                f.id === fileId ? { ...f, processingStatus: "processing" } : f
            )
        );
        const result = await processFileAction(fileId);
        // Refresh file list to get updated status
        const updated = await getAllFiles();
        setFiles(updated);
        if (result.error) {
            setPreviewError(result.error);
        }
    }, []);

    const handlePreview = useCallback(async (fileId: string) => {
        setPreviewLoading(true);
        setPreviewError(null);
        setPreviewFile(null);

        const result = await getFilePreviewContent(fileId);

        if (result.error) {
            if (result.fileType === "pdf") {
                // For PDFs, just open the download URL in a new tab
                const dlResult = await getFileDownloadUrl(fileId);
                if (dlResult.url) {
                    window.open(dlResult.url, "_blank");
                }
                setPreviewLoading(false);
                return;
            }
            if (result.fileType === "xlsx") {
                setPreviewError("XLSX preview not supported yet. Use the download link instead.");
                setPreviewLoading(false);
                return;
            }
            setPreviewError(result.error);
            setPreviewLoading(false);
            return;
        }

        setPreviewFile({
            content: result.content!,
            filename: result.filename!,
            totalLines: result.totalLines!,
        });
        setPreviewLoading(false);
    }, []);

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Documents
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    All your uploaded financial documents
                </p>
            </div>

            {/* Category filter */}
            {categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setFilterCategory(null)}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${filterCategory === null
                            ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                            : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600"
                            }`}
                    >
                        All ({files.length})
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilterCategory(cat)}
                            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${filterCategory === cat
                                ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600"
                                }`}
                        >
                            {CATEGORY_LABELS[cat] ?? cat} (
                            {files.filter((f) => f.category === cat).length})
                        </button>
                    ))}
                </div>
            )}

            {/* File list */}
            {filteredFiles.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {files.length === 0
                            ? "No documents uploaded yet."
                            : "No documents in this category."}
                    </p>
                </div>
            ) : (
                <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {filteredFiles.map((file) => (
                            <div
                                key={file.id}
                                className="flex items-center justify-between px-5 py-4"
                            >
                                <div className="flex items-center gap-4">
                                    <FileTypeIcon type={file.fileType} />
                                    <div>
                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                            {file.filename}
                                        </p>
                                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                            {CATEGORY_LABELS[file.category] ?? file.category}
                                            {file.period && ` · ${file.period}`}
                                            {" · "}
                                            {new Date(file.createdAt).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <StatusBadge status={file.processingStatus} />
                                    {(file.processingStatus === "pending" || file.processingStatus === "failed") &&
                                        (file.fileType === "csv" || file.fileType === "xlsx") && (
                                            <button
                                                onClick={() => handleProcess(file.id)}
                                                className="rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                                            >
                                                Process
                                            </button>
                                        )}
                                    <button
                                        onClick={() => handlePreview(file.id)}
                                        className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                                    >
                                        Preview
                                    </button>
                                    <button
                                        onClick={() => handleDownload(file.id)}
                                        className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                                    >
                                        Download
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Preview panel */}
            {previewLoading && (
                <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Loading preview...
                    </p>
                </div>
            )}

            {previewError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                        {previewError}
                    </p>
                </div>
            )}

            {previewFile && (
                <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
                        <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {previewFile.filename}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Showing first 50 of {previewFile.totalLines} lines
                            </p>
                        </div>
                        <button
                            onClick={() => setPreviewFile(null)}
                            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        >
                            Close
                        </button>
                    </div>
                    <div className="overflow-x-auto p-4">
                        <pre className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                            {previewFile.content}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}

function FileTypeIcon({ type }: { type: string }) {
    const colors: Record<string, string> = {
        csv: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        xlsx: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        pdf: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        other: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
    };

    return (
        <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold uppercase ${colors[type] || colors.other}`}
        >
            {type}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        pending:
            "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        processing:
            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        completed:
            "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };

    return (
        <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || styles.pending}`}
        >
            {status}
        </span>
    );
}
