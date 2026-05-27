"use client";

import { useState, useRef, useActionState, useCallback, useEffect } from "react";
import { uploadFile, getUserFiles, deleteFile } from "./actions";
import { getFileDownloadUrl, getFilePreviewContent } from "../documents/actions";
import { processFileAction } from "../documents/process-action";
import { checkDuplicates, deleteDuplicateTransactions, type DuplicateGroup } from "./duplicates";

const CATEGORIES = [
    { value: "bank_statements", label: "Bank Statements" },
    { value: "invoices", label: "Invoices" },
    { value: "receipts", label: "Receipts" },
    { value: "tax_documents", label: "Tax Documents" },
    { value: "payroll", label: "Payroll" },
    { value: "other", label: "Other" },
] as const;

const PERIODS = [
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "annual", label: "Annual" },
] as const;

type FileRecord = {
    id: string;
    filename: string;
    fileType: string;
    category: string;
    period: string | null;
    processingStatus: string;
    createdAt: Date;
};

export default function UploadPage() {
    const [selectedCategory, setSelectedCategory] = useState("bank_statements");
    const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [files, setFiles] = useState<FileRecord[]>([]);
    const [processing, setProcessing] = useState<string | null>(null);
    const [processResult, setProcessResult] = useState<string | null>(null);
    const [preview, setPreview] = useState<{
        filename: string;
        content?: string;
        totalLines?: number;
        url?: string;
        fileType: string;
    } | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [state, formAction, pending] = useActionState(uploadFile, null);

    // Load existing files
    useEffect(() => {
        getUserFiles().then(setFiles);
        checkDuplicates().then(setDuplicates);
    }, []);

    // Refresh file list after successful upload
    useEffect(() => {
        if (state?.success) {
            getUserFiles().then(setFiles);
            setSelectedFile(null);
        }
    }, [state]);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            setSelectedFile(file);
            if (fileInputRef.current) {
                const dt = new DataTransfer();
                dt.items.add(file);
                fileInputRef.current.files = dt.files;
            }
        }
    }, []);

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files[0]) {
                setSelectedFile(e.target.files[0]);
            }
        },
        []
    );

    const handleDownload = useCallback(async (fileId: string) => {
        const result = await getFileDownloadUrl(fileId);
        if (result.url) {
            window.open(result.url, "_blank");
        }
    }, []);

    const handlePreview = useCallback(async (fileId: string, fileType: string) => {
        setPreviewLoading(true);
        setPreview(null);

        if (fileType === "pdf") {
            // For PDFs, get a signed URL and show in iframe
            const dlResult = await getFileDownloadUrl(fileId);
            if (dlResult.url) {
                setPreview({ filename: dlResult.filename!, url: dlResult.url, fileType: "pdf" });
            }
            setPreviewLoading(false);
            return;
        }

        // For CSV/XLSX, get text content
        const result = await getFilePreviewContent(fileId);
        if (result.content) {
            setPreview({
                filename: result.filename!,
                content: result.content,
                totalLines: result.totalLines,
                fileType,
            });
        }
        setPreviewLoading(false);
    }, []);

    const handleProcess = useCallback(async (fileId: string) => {
        setProcessing(fileId);
        setProcessResult(null);
        const result = await processFileAction(fileId);
        setProcessing(null);
        if (result.success) {
            setProcessResult(result.success);
        } else if (result.error) {
            setProcessResult(`Error: ${result.error}`);
        }
        // Refresh files to get updated status
        const updated = await getUserFiles();
        setFiles(updated);
        // Check for duplicates after processing
        const dups = await checkDuplicates();
        setDuplicates(dups);
    }, []);

    const handleDelete = useCallback(async (fileId: string) => {
        if (!confirm("Delete this file and its extracted transactions?")) return;
        await deleteFile(fileId);
        const updated = await getUserFiles();
        setFiles(updated);
    }, []);

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getCategoryLabel = (value: string) =>
        CATEGORIES.find((c) => c.value === value)?.label ?? value;

    return (
        <div className="mx-auto max-w-3xl space-y-8">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Upload
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Drop your financial data — CSVs, bank exports, invoices, receipts
                </p>
            </div>

            {/* Status messages */}
            {state?.error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                    {state.error}
                </div>
            )}
            {state?.success && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                    {state.success}
                </div>
            )}
            {processResult && (
                <div
                    className={`rounded-lg border px-4 py-3 text-sm ${processResult.startsWith("Error")
                        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                        }`}
                >
                    {processResult}
                </div>
            )}

            {/* Category selection */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Document category
                </label>
                <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.value}
                            type="button"
                            onClick={() => setSelectedCategory(cat.value)}
                            className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${selectedCategory === cat.value
                                ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Period selection (optional) */}
            <div className="space-y-3">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Time period{" "}
                    <span className="font-normal text-zinc-400 dark:text-zinc-500">
                        (optional)
                    </span>
                </label>
                <div className="flex flex-wrap gap-2">
                    {PERIODS.map((period) => (
                        <button
                            key={period.value}
                            type="button"
                            onClick={() =>
                                setSelectedPeriod(
                                    selectedPeriod === period.value ? null : period.value
                                )
                            }
                            className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${selectedPeriod === period.value
                                ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                                }`}
                        >
                            {period.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Upload form */}
            <form action={formAction}>
                <input type="hidden" name="category" value={selectedCategory} />
                <input type="hidden" name="period" value={selectedPeriod ?? ""} />

                {/* Drop zone */}
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors ${dragActive
                        ? "border-zinc-500 bg-zinc-100 dark:border-zinc-400 dark:bg-zinc-800/50"
                        : selectedFile
                            ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/20"
                            : "border-zinc-300 bg-zinc-50/50 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900/30 dark:hover:border-zinc-600"
                        }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        name="file"
                        accept=".csv,.xlsx,.xls,.pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    {selectedFile ? (
                        <>
                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    className="text-emerald-600 dark:text-emerald-400"
                                >
                                    <path
                                        d="M5 10L8.5 13.5L15 7"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {selectedFile.name}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                {formatFileSize(selectedFile.size)} · Click or drop to replace
                            </p>
                        </>
                    ) : (
                        <>
                            <svg
                                width="40"
                                height="40"
                                viewBox="0 0 40 40"
                                fill="none"
                                className="mb-4 text-zinc-400 dark:text-zinc-500"
                            >
                                <path
                                    d="M20 28V8M20 8L13 15M20 8L27 15"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M6 28V32C6 33.1046 6.89543 34 8 34H32C33.1046 34 34 33.1046 34 32V28"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Drag and drop files here
                            </p>
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                CSV, XLSX, PDF — up to 10MB
                            </p>
                        </>
                    )}
                </div>

                {/* Upload context summary + submit */}
                <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Uploading to:{" "}
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                            {getCategoryLabel(selectedCategory)}
                        </span>
                        {selectedPeriod && (
                            <>
                                {" · "}
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                    {PERIODS.find((p) => p.value === selectedPeriod)?.label}
                                </span>
                            </>
                        )}
                    </p>
                    <button
                        type="submit"
                        disabled={!selectedFile || pending}
                        className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-900 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:hover:bg-white"
                    >
                        {pending ? "Uploading..." : "Upload file"}
                    </button>
                </div>
            </form>

            {/* Duplicate transactions warning */}
            {duplicates.length > 0 && (
                <DuplicatesPanel
                    duplicates={duplicates}
                    onResolve={async (group) => {
                        const toDelete = group.transactions.slice(1).map((t) => t.id);
                        await deleteDuplicateTransactions(toDelete);
                        const dups = await checkDuplicates();
                        setDuplicates(dups);
                    }}
                />
            )}

            {/* Recent uploads with actions */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Recent Uploads
                </h2>
                {files.length === 0 ? (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        No files uploaded yet. Upload your first file to get started.
                    </p>
                ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {files.map((file) => (
                            <div
                                key={file.id}
                                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                            >
                                <div className="flex items-center gap-3">
                                    <FileTypeIcon type={file.fileType} />
                                    <div>
                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                            {file.filename}
                                        </p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {getCategoryLabel(file.category)}
                                            {file.period && ` · ${file.period}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {file.processingStatus === "completed" && processing !== file.id ? (
                                        <a
                                            href={`/transactions?fileId=${file.id}`}
                                            className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                                        >
                                            completed
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </a>
                                    ) : (
                                        <StatusBadge status={processing === file.id ? "processing" : file.processingStatus} />
                                    )}
                                    {(file.processingStatus === "pending" ||
                                        file.processingStatus === "failed") &&
                                        (file.fileType === "csv" || file.fileType === "xlsx") && (
                                            processing === file.id ? (
                                                <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                                                    AI extracting (~15-30s)
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleProcess(file.id)}
                                                    className="rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                                                >
                                                    Process
                                                </button>
                                            )
                                        )}
                                    <button
                                        onClick={() => handlePreview(file.id, file.fileType)}
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
                                    <button
                                        onClick={() => handleDelete(file.id)}
                                        className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {(preview || previewLoading) && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    onClick={() => { setPreview(null); setPreviewLoading(false); }}
                >
                    <div
                        className="relative mx-4 flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    {preview?.filename ?? "Loading..."}
                                </h3>
                                {preview?.totalLines && (
                                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                        Showing first 50 of {preview.totalLines} lines
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => { setPreview(null); setPreviewLoading(false); }}
                                className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal body */}
                        <div className="flex-1 overflow-auto p-6">
                            {previewLoading && (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading preview...</p>
                            )}
                            {preview?.fileType === "pdf" && preview.url && (
                                <iframe
                                    src={preview.url}
                                    className="h-[70vh] w-full rounded-lg border border-zinc-200 dark:border-zinc-700"
                                    title={preview.filename}
                                />
                            )}
                            {preview?.content && (
                                <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
                                    <pre className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                                        {preview.content}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DuplicatesPanel({
    duplicates,
    onResolve,
}: {
    duplicates: DuplicateGroup[];
    onResolve: (group: DuplicateGroup) => Promise<void>;
}) {
    const [expanded, setExpanded] = useState(false);

    const totalDuplicateCount = duplicates.reduce((sum, g) => sum + (g.count - 1), 0);
    const totalDuplicateAmount = duplicates.reduce(
        (sum, g) => sum + Math.abs(Number(g.amount)) * (g.count - 1),
        0
    );

    return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex w-full items-center justify-between px-5 py-4"
            >
                <div className="flex items-center gap-2.5">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <div className="text-left">
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                            {totalDuplicateCount} possible duplicate{totalDuplicateCount !== 1 ? "s" : ""} detected
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                            ${totalDuplicateAmount.toLocaleString()} in duplicate amounts across {duplicates.length} group{duplicates.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className={`text-amber-600 transition-transform dark:text-amber-400 ${expanded ? "rotate-180" : ""}`}
                >
                    <path
                        d="M4 6L8 10L12 6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>

            {expanded && (
                <div className="border-t border-amber-200 px-5 pb-5 pt-4 dark:border-amber-800/50">
                    <p className="mb-3 text-xs text-amber-700 dark:text-amber-400">
                        Transactions with the same description, amount, and date. Click to keep one and remove the rest.
                    </p>
                    <div className="space-y-3">
                        {duplicates.map((group, i) => (
                            <div
                                key={i}
                                className="rounded-lg border border-amber-200 bg-white p-4 dark:border-amber-800/50 dark:bg-zinc-900"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                            {group.description}
                                        </p>
                                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                            {group.date} · ${Math.abs(Number(group.amount)).toLocaleString()} · {group.count} occurrences
                                        </p>
                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                            {group.transactions.map((t) => (
                                                <span
                                                    key={t.id}
                                                    className="inline-flex rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                                >
                                                    {t.filename ?? "unknown"}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onResolve(group)}
                                        className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700"
                                    >
                                        Keep 1, remove {group.count - 1}
                                    </button>
                                </div>
                            </div>
                        ))}
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
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold uppercase ${colors[type] || colors.other}`}
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
