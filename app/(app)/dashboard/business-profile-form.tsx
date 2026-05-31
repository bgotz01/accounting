"use client";

import { useActionState, useState } from "react";
import { upsertBusinessProfile, type BusinessProfileData, type BusinessProfileState } from "./business-profile-actions";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "SAR", "AED", "INR"];

const INDUSTRIES = [
    "E-commerce / Retail",
    "Technology / SaaS",
    "Professional Services",
    "Healthcare",
    "Real Estate",
    "Manufacturing",
    "Food & Beverage",
    "Marketing / Advertising",
    "Finance / Accounting",
    "Education",
    "Logistics / Shipping",
    "Other",
];

const COUNTRIES = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia",
    "Australia", "Austria", "Azerbaijan", "Bahrain", "Bangladesh", "Belarus", "Belgium",
    "Bolivia", "Bosnia and Herzegovina", "Brazil", "Bulgaria", "Cambodia", "Cameroon",
    "Canada", "Chile", "China", "Colombia", "Costa Rica", "Croatia", "Cuba", "Cyprus",
    "Czech Republic", "Denmark", "Dominican Republic", "Ecuador", "Egypt", "El Salvador",
    "Estonia", "Ethiopia", "Finland", "France", "Georgia", "Germany", "Ghana", "Greece",
    "Guatemala", "Honduras", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia",
    "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan",
    "Kazakhstan", "Kenya", "Kuwait", "Latvia", "Lebanon", "Libya", "Lithuania",
    "Luxembourg", "Malaysia", "Malta", "Mexico", "Moldova", "Morocco", "Mozambique",
    "Myanmar", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Nigeria", "Norway",
    "Oman", "Pakistan", "Panama", "Paraguay", "Peru", "Philippines", "Poland",
    "Portugal", "Qatar", "Romania", "Russia", "Saudi Arabia", "Senegal", "Serbia",
    "Singapore", "Slovakia", "Slovenia", "South Africa", "South Korea", "Spain",
    "Sri Lanka", "Sudan", "Sweden", "Switzerland", "Syria", "Taiwan", "Tanzania",
    "Thailand", "Tunisia", "Turkey", "Uganda", "Ukraine", "United Arab Emirates",
    "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Venezuela", "Vietnam",
    "Yemen", "Zambia", "Zimbabwe",
];

const LOCAL_STANDARD_COUNTRIES: Record<string, string> = {
    "United States": "GAAP",
    "China": "CAS",
    "Japan": "J-GAAP",
    "India": "Ind AS",
    "South Korea": "K-GAAP",
    "Indonesia": "PSAK",
    "Vietnam": "VAS",
    "Bangladesh": "BFRS",
    "Pakistan": "PFRS",
    "Egypt": "EAS",
    "Ethiopia": "IPSAS",
    "Iran": "NIAS",
    "Syria": "SGAS",
    "Myanmar": "MFRS",
};

type StandardMode = "GAAP" | "IFRS" | "other";

function suggestForCountry(country: string): { mode: StandardMode; otherLabel: string } {
    if (!country) return { mode: "IFRS", otherLabel: "" };
    if (country === "United States") return { mode: "GAAP", otherLabel: "" };
    const local = LOCAL_STANDARD_COUNTRIES[country];
    if (local && local !== "IFRS") return { mode: "other", otherLabel: local };
    return { mode: "IFRS", otherLabel: "" };
}

function parseStandard(value: string): { mode: StandardMode; otherLabel: string } {
    if (value === "GAAP") return { mode: "GAAP", otherLabel: "" };
    if (value === "IFRS") return { mode: "IFRS", otherLabel: "" };
    return { mode: "other", otherLabel: value };
}

const initialState: BusinessProfileState = {};

export function BusinessProfileForm({
    initialProfile,
}: {
    initialProfile: BusinessProfileData | null;
}) {
    const [state, formAction, pending] = useActionState(upsertBusinessProfile, initialState);

    const savedStandard = initialProfile?.accountingStandard ?? "GAAP";
    const parsed = parseStandard(savedStandard);
    const [mode, setMode] = useState<StandardMode>(parsed.mode);
    const [otherLabel, setOtherLabel] = useState(parsed.otherLabel);

    const profile = state.profile ?? initialProfile;
    const effectiveStandard = mode === "other" ? (otherLabel.trim() || "Other") : mode;

    function handleCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const { mode: suggestedMode, otherLabel: suggestedLabel } = suggestForCountry(e.target.value);
        setMode(suggestedMode);
        if (suggestedLabel) setOtherLabel(suggestedLabel);
    }

    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-5">
                <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Business Profile
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                    This helps the AI understand your business context for better accounting insights
                </p>
            </div>

            <form action={formAction}>
                <input type="hidden" name="accountingStandard" value={effectiveStandard} />

                <div className="grid gap-4 sm:grid-cols-2">
                    {/* Business Name */}
                    <div className="sm:col-span-2">
                        <label
                            htmlFor="businessName"
                            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                        >
                            Business Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="businessName"
                            name="businessName"
                            type="text"
                            required
                            defaultValue={profile?.businessName ?? ""}
                            placeholder="Acme Corp"
                            className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500"
                        />
                    </div>

                    {/* Industry */}
                    <div>
                        <label
                            htmlFor="industry"
                            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                        >
                            Industry
                        </label>
                        <select
                            id="industry"
                            name="industry"
                            defaultValue={profile?.industry ?? ""}
                            className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500"
                        >
                            <option value="">Select industry…</option>
                            {INDUSTRIES.map((ind) => (
                                <option key={ind} value={ind}>{ind}</option>
                            ))}
                        </select>
                    </div>

                    {/* Currency */}
                    <div>
                        <label
                            htmlFor="currency"
                            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                        >
                            Currency
                        </label>
                        <select
                            id="currency"
                            name="currency"
                            defaultValue={profile?.currency ?? "USD"}
                            className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500"
                        >
                            {CURRENCIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Country */}
                    <div>
                        <label
                            htmlFor="country"
                            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                        >
                            Country
                        </label>
                        <select
                            id="country"
                            name="country"
                            defaultValue={profile?.country ?? ""}
                            onChange={handleCountryChange}
                            className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500"
                        >
                            <option value="">Select country…</option>
                            {COUNTRIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Accounting Standard */}
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Accounting Standard
                        </label>
                        <div className="mt-1.5 flex gap-2">
                            <button
                                type="button"
                                onClick={() => setMode("GAAP")}
                                aria-pressed={mode === "GAAP"}
                                className={`flex flex-1 flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${mode === "GAAP"
                                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                                        : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600"
                                    }`}
                            >
                                <span className="text-sm font-semibold">GAAP</span>
                                <span className="text-[10px] leading-tight opacity-70">US standard</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setMode("IFRS")}
                                aria-pressed={mode === "IFRS"}
                                className={`flex flex-1 flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${mode === "IFRS"
                                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                                        : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600"
                                    }`}
                            >
                                <span className="text-sm font-semibold">IFRS</span>
                                <span className="text-[10px] leading-tight opacity-70">International</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setMode("other")}
                                aria-pressed={mode === "other"}
                                className={`flex flex-1 flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${mode === "other"
                                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                                        : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600"
                                    }`}
                            >
                                <span className="text-sm font-semibold">
                                    {otherLabel || "Other"}
                                </span>
                                <span className="text-[10px] leading-tight opacity-70">Local / custom</span>
                            </button>
                        </div>

                        {mode === "other" && (
                            <input
                                type="text"
                                value={otherLabel}
                                onChange={(e) => setOtherLabel(e.target.value)}
                                placeholder="e.g. J-GAAP, CAS, Ind AS…"
                                className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500"
                            />
                        )}
                    </div>

                    {/* Tax ID */}
                    <div>
                        <label
                            htmlFor="taxId"
                            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                        >
                            Tax ID / VAT Number
                        </label>
                        <input
                            id="taxId"
                            name="taxId"
                            type="text"
                            defaultValue={profile?.taxId ?? ""}
                            placeholder="12-3456789"
                            className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500"
                        />
                    </div>

                    {/* Fiscal Year Start */}
                    <div>
                        <label
                            htmlFor="fiscalYearStart"
                            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                        >
                            Fiscal Year Start
                        </label>
                        <select
                            id="fiscalYearStart"
                            name="fiscalYearStart"
                            defaultValue={profile?.fiscalYearStart ?? 1}
                            className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500"
                        >
                            {MONTHS.map((month, i) => (
                                <option key={month} value={i + 1}>{month}</option>
                            ))}
                        </select>
                    </div>

                    {/* Notes */}
                    <div className="sm:col-span-2">
                        <label
                            htmlFor="notes"
                            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                        >
                            Notes
                        </label>
                        <textarea
                            id="notes"
                            name="notes"
                            rows={2}
                            defaultValue={profile?.notes ?? ""}
                            placeholder="Any additional context about your business…"
                            className="mt-1.5 w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500"
                        />
                    </div>
                </div>

                {state.error && (
                    <p
                        role="alert"
                        aria-live="polite"
                        className="mt-3 text-xs font-medium text-red-600 dark:text-red-400"
                    >
                        {state.error}
                    </p>
                )}

                {state.success && (
                    <p
                        role="status"
                        aria-live="polite"
                        className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                    >
                        Profile saved.
                    </p>
                )}

                <div className="mt-5">
                    <button
                        type="submit"
                        disabled={pending}
                        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                        {pending ? "Saving…" : "Save Profile"}
                    </button>
                </div>
            </form>
        </div>
    );
}
