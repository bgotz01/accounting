"use client";

import { useEffect, useState, useCallback, useRef, useActionState } from "react";
import { getAllFiles, getFileDownloadUrl, getFilePreviewContent } from "./actions";
import { uploadFile, deleteFile, suggestFileCategory } from "../upload/actions";
import { checkDuplicates, deleteDuplicateTransactions, type DuplicateGroup } from "../upload/duplicates";
import { useCurrency } from "@/app/components/currency-context";

const CATEGORIES = [
    { value: "bank_statements", label: "Bank Statements" },
    { value: "invoices", label: "Invoices" },
    { value: "receipts", label: "Receipts" },
    { value: "tax_documents", label: "Tax Documents" },
    { value: "payroll", label: "Payroll" },
    { value: "ads_reports", label: "Ads / Marketing" },
    { value: "other", label: "Other" },
] as const;

const PERIODS = [
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "annual", label: "Annual" },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
    bank_statements: "Bank Statements",
    invoices: "Invoices",
    receipts: "Receipts",
    tax_documents: "Tax Documents",
    payroll: "Payroll",
    ads_reports: "Ads / Marketing",
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
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
    const { fmt } = useCurrency();

    // Upload state
    const [showUpload, setShowUpload] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("bank_statements");
    const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadState, formAction, uploading] = useActionState(uploadFile, null);

    // AI category suggestion state
    const [suggestedCategory, setSuggestedCategory] = useState<{
        category: string;
        confidence: number;
        reason: string;
    } | null>(null);
    const [suggesting, setSuggesting] = useState(false);

    // Preview modal
    const [preview, setPreview] = useState<{
        filename: string;
        content?: string;
        totalLines?: number;
        url?: string;
        fileType: string;
    } | null>(null);

    useEffect(() => {
        getAllFiles().then(setFiles);
        checkDuplicates().then(setDuplicates);
    }, []);

    // Poll every 3s while any file is still processing
    useEffect(() => {
        const hasProcessing = files.some((f) => f.processingStatus === "processing");
        if (!hasProcessing) return;
        const timer = setInterval(async () => {
            const updated = await getAllFiles();
            setFiles(updated);
            const stillProcessing = updated.some((f) => f.processingStatus === "processing");
            if (!stillProcessing) {
                clearInterval(timer);
                checkDuplicates().then(setDuplicates);
            }
        }, 3000);
        return () => clearInterval(timer);
    }, [files]);

    useEffect(() => {
        if (uploadState?.success) {
            getAllFiles().then(setFiles);
            setSelectedFile(null);
            setSuggestedCategory(null);
            setShowUpload(false);
            checkDuplicates().then(setDuplicates);
        }
    }, [uploadState]);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    }, []);

    const triggerCategorySuggestion = useCallback(async (file: File) => {
        setSuggestedCategory(null);
        setSuggesting(true);
        try {
            // Read up to 2KB of the file as a text sample
            const slice = file.slice(0, 2048);
            const sample = await slice.text().catch(() => "");
            const result = await suggestFileCategory(file.name, sample);
            if (result) {
                setSuggestedCategory(result);
                // Auto-apply if confidence is high enough
                if (result.confidence >= 0.7) {
                    setSelectedCategory(result.category);
                }
            }
        } finally {
            setSuggesting(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files?.[0]) {
            const file = e.dataTransfer.files[0];
            setSelectedFile(file);
            triggerCategorySuggestion(file);
            if (fileInputRef.current) {
                const dt = new DataTransfer();
                dt.items.add(file);
                fileInputRef.current.files = dt.files;
            }
        }
    }, [triggerCategorySuggestion]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleDownload = useCallback(async (fileId: string) => {
        const result = await getFileDownloadUrl(fileId);
        if (result.url) window.open(result.url, "_blank");
    }, []);

    const handleDelete = useCallback(async (fileId: string) => {
        if (!confirm("Delete this file and its extracted transactions?")) return;
        await deleteFile(fileId);
        const updated = await getAllFiles();
        setFiles(updated);
        checkDuplicates().then(setDuplicates);
    }, []);

    const handlePreview = useCallback(async (fileId: string, fileType: string) => {
        setPreviewError(null);
        try {
            if (fileType === "pdf") {
                const dlResult = await getFileDownloadUrl(fileId);
                if (dlResult.url) {
                    setPreview({ filename: dlResult.filename!, url: dlResult.url, fileType: "pdf" });
                } else {
                    setPreviewError((dlResult as any).error ?? "Could not generate preview URL.");
                }
                return;
            }
            if (fileType === "csv" || fileType === "xlsx") {
                const result = await getFilePreviewContent(fileId);
                if (result.content) {
                    setPreview({ filename: result.filename!, content: result.content, totalLines: result.totalLines, fileType });
                } else {
                    setPreviewError((result as any).error ?? "Could not load preview.");
                }
                return;
            }
            setPreviewError("Preview not available for this file type.");
        } catch (e: any) {
            setPreviewError(e?.message ?? "An unexpected error occurred.");
        }
    }, []);

    const filteredFiles = filterCategory
        ? files.filter((f) => f.category === filterCategory)
        : files;

    const fileCategories = [...new Set(files.map((f) => f.category))];

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Documents
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Upload and manage your financial documents
                    </p>
                </div>
                <button
                    onClick={() => setShowUpload(!showUpload)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${showUpload
                        ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                        : "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                        }`}
                >
                    {showUpload ? "Cancel" : "Upload file"}
                </button>
            </div>

            {/* Upload section */}
            {showUpload && (
                <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    {uploadState?.error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                            {uploadState.error}
                        </div>
                    )}

                    {/* Category + Period */}
                    <div className="flex flex-wrap gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Category</label>
                            <div className="flex flex-wrap gap-1.5">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.value}
                                        type="button"
                                        onClick={() => setSelectedCategory(cat.value)}
                                        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${selectedCategory === cat.value
                                            ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                                            : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
                                            }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Period (optional)</label>
                            <div className="flex gap-1.5">
                                {PERIODS.map((p) => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => setSelectedPeriod(selectedPeriod === p.value ? null : p.value)}
                                        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${selectedPeriod === p.value
                                            ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                                            : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
                                            }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* AI category suggestion banner */}
                    {suggesting && (
                        <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                            Detecting document type…
                        </div>
                    )}
                    {!suggesting && suggestedCategory && (
                        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-950/30">
                            <p className="text-xs text-blue-700 dark:text-blue-400">
                                <span className="font-medium">AI suggestion:</span>{" "}
                                {CATEGORIES.find((c) => c.value === suggestedCategory.category)?.label ?? suggestedCategory.category}
                                {suggestedCategory.confidence >= 0.7
                                    ? " (auto-applied)"
                                    : " — click to apply"}
                                {suggestedCategory.reason && (
                                    <span className="ml-1 text-blue-500 dark:text-blue-500">· {suggestedCategory.reason}</span>
                                )}
                            </p>
                            {suggestedCategory.confidence < 0.7 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedCategory(suggestedCategory.category)}
                                    className="ml-3 shrink-0 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
                                >
                                    Apply
                                </button>
                            )}
                        </div>
                    )}

                    {/* Drop zone + submit */}
                    <form action={formAction}>
                        <input type="hidden" name="category" value={selectedCategory} />
                        <input type="hidden" name="period" value={selectedPeriod ?? ""} />
                        <div
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${dragActive
                                ? "border-zinc-500 bg-zinc-100 dark:border-zinc-400 dark:bg-zinc-800/50"
                                : selectedFile
                                    ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/20"
                                    : "border-zinc-300 bg-zinc-50/50 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/30"
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                name="file"
                                accept=".csv,.xlsx,.xls,.pdf"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                        const file = e.target.files[0];
                                        setSelectedFile(file);
                                        triggerCategorySuggestion(file);
                                    }
                                }}
                                className="hidden"
                            />
                            {selectedFile ? (
                                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                    <span className="font-medium">{selectedFile.name}</span>
                                    <span className="ml-2 text-zinc-400">· Click or drop to replace</span>
                                </p>
                            ) : (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Drop a file here or click to browse · CSV, XLSX, PDF up to 10MB
                                </p>
                            )}
                        </div>
                        <div className="mt-3 flex justify-end">
                            <button
                                type="submit"
                                disabled={!selectedFile || uploading}
                                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                            >
                                {uploading ? "Uploading..." : "Upload"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Preview error */}
            {previewError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                    Preview failed: {previewError}
                </div>
            )}

            {/* Upload success */}
            {uploadState?.success && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                    {uploadState.success}
                </div>
            )}

            {/* Duplicates warning */}
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

            {/* Category filter */}
            {fileCategories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setFilterCategory(null)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${filterCategory === null
                            ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                            : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
                            }`}
                    >
                        All ({files.length})
                    </button>
                    {fileCategories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilterCategory(cat)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${filterCategory === cat
                                ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                                : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
                                }`}
                        >
                            {CATEGORY_LABELS[cat] ?? cat} ({files.filter((f) => f.category === cat).length})
                        </button>
                    ))}
                </div>
            )}

            {/* File list */}
            {filteredFiles.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {files.length === 0 ? "No documents yet. Upload your first file above." : "No documents in this category."}
                    </p>
                </div>
            ) : (
                <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {filteredFiles.map((file) => (
                            <div key={file.id} className="flex items-center justify-between px-5 py-4">
                                <div className="flex items-center gap-4">
                                    <FileTypeIcon type={file.fileType} />
                                    <div>
                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{file.filename}</p>
                                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                            {CATEGORY_LABELS[file.category] ?? file.category}
                                            {file.period && ` · ${file.period}`}
                                            {" · "}
                                            {new Date(file.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {file.processingStatus === "completed" ? (
                                        <a
                                            href={`/transactions?fileId=${file.id}`}
                                            className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                                        >
                                            completed →
                                        </a>
                                    ) : (
                                        <StatusBadge status={file.processingStatus} />
                                    )}
                                    <button
                                        onClick={() => handlePreview(file.id, file.fileType)}
                                        className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                                    >
                                        Preview
                                    </button>
                                    <button
                                        onClick={() => handleDownload(file.id)}
                                        className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                                    >
                                        Download
                                    </button>
                                    <button
                                        onClick={() => handleDelete(file.id)}
                                        className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {preview && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    onClick={() => setPreview(null)}
                >
                    <div
                        className="relative mx-4 flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{preview.filename}</h3>
                                {preview.totalLines && (
                                    <p className="mt-0.5 text-xs text-zinc-500">Showing first 50 of {preview.totalLines} lines</p>
                                )}
                            </div>
                            <button
                                onClick={() => setPreview(null)}
                                className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-6">
                            {preview.fileType === "pdf" && preview.url && (
                                <iframe src={preview.url} className="h-[70vh] w-full rounded-lg border border-zinc-200 dark:border-zinc-700" />
                            )}
                            {preview.content && (
                                <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs leading-relaxed text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                    {preview.content}
                                </pre>
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
    const { fmt } = useCurrency();
    const totalCount = duplicates.reduce((sum, g) => sum + (g.count - 1), 0);
    const totalAmount = duplicates.reduce((sum, g) => sum + Math.abs(Number(g.amount)) * (g.count - 1), 0);

    return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2.5">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <div className="text-left">
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                            {totalCount} possible duplicate{totalCount !== 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                            {fmt(totalAmount)} across {duplicates.length} group{duplicates.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`text-amber-600 transition-transform ${expanded ? "rotate-180" : ""}`}>
                    <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            {expanded && (
                <div className="border-t border-amber-200 px-5 pb-5 pt-4 dark:border-amber-800/50">
                    <div className="space-y-3">
                        {duplicates.map((group, i) => (
                            <div key={i} className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-3 dark:border-amber-800/50 dark:bg-zinc-900">
                                <div>
                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{group.description}</p>
                                    <p className="text-xs text-zinc-500">{group.date} · {fmt(Math.abs(Number(group.amount)))} · {group.count}×</p>
                                </div>
                                <button
                                    onClick={() => onResolve(group)}
                                    className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
                                >
                                    Keep 1
                                </button>
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
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold uppercase ${colors[type] || colors.other}`}>
            {type}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    return (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || styles.pending}`}>
            {status}
        </span>
    );
}
