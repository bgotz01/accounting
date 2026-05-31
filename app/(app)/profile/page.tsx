import { getBusinessProfile } from "@/app/(app)/dashboard/business-profile-actions";
import { BusinessProfileForm } from "@/app/(app)/dashboard/business-profile-form";

export default async function SettingsPage() {
    const businessProfile = await getBusinessProfile();

    return (
        <div className="mx-auto max-w-2xl space-y-8">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Profile
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Manage your business profile and preferences
                </p>
            </div>

            <BusinessProfileForm initialProfile={businessProfile} />
        </div>
    );
}
