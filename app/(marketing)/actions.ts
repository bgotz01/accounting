"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

type AuthState = {
    error?: string;
    success?: string;
} | null;

export async function login(
    _prevState: AuthState,
    formData: FormData
): Promise<AuthState> {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "Email and password are required." };
    }

    try {
        const supabase = await createClient();
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return { error: error.message };
        }
    } catch (error) {
        console.error("Login failed because auth is unavailable:", error);
        return {
            error: "Authentication service is unavailable. Please try again later.",
        };
    }

    redirect("/dashboard");
}

export async function signup(
    _prevState: AuthState,
    formData: FormData
): Promise<AuthState> {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!email || !password || !confirmPassword) {
        return { error: "Email and both password fields are required." };
    }

    if (password.length < 6) {
        return { error: "Password must be at least 6 characters." };
    }

    if (password !== confirmPassword) {
        return { error: "Passwords do not match." };
    }

    try {
        const admin = createAdminClient();

        // Check for existing email without triggering a signup email
        const { data, error: listError } = await admin.auth.admin.listUsers();
        if (listError) throw listError;

        const existingEmail = data.users?.find(
            (u) => u.email?.toLowerCase() === email.toLowerCase()
        );
        if (existingEmail) {
            return { error: "That email is already in use." };
        }

        // Create user via admin API — bypasses confirmation email entirely
        const { error: createError } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });
        if (createError) {
            return { error: createError.message };
        }

        // Sign the user in immediately
        const supabase = await createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
            return { error: signInError.message };
        }
    } catch (error) {
        console.error("Signup failed because auth is unavailable:", error);
        return {
            error: "Authentication service is unavailable. Please try again later.",
        };
    }

    redirect("/dashboard");
}

export async function forgotPassword(
    _prevState: AuthState,
    formData: FormData
): Promise<AuthState> {
    const email = formData.get("email") as string;

    if (!email) {
        return { error: "Email is required." };
    }

    try {
        const supabase = await createClient();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=/reset-password`,
        });

        if (error) {
            return { error: error.message };
        }
    } catch (error) {
        console.error("Password reset request failed:", error);
        return {
            error: "Authentication service is unavailable. Please try again later.",
        };
    }

    // Always return success to avoid leaking whether the email exists
    return { success: "If that email is registered, you'll receive a reset link shortly." };
}

export async function resetPassword(
    _prevState: AuthState,
    formData: FormData
): Promise<AuthState> {
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!password || !confirmPassword) {
        return { error: "Both password fields are required." };
    }

    if (password.length < 6) {
        return { error: "Password must be at least 6 characters." };
    }

    if (password !== confirmPassword) {
        return { error: "Passwords do not match." };
    }

    try {
        const supabase = await createClient();
        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            return { error: error.message };
        }
    } catch (error) {
        console.error("Password reset failed:", error);
        return {
            error: "Authentication service is unavailable. Please try again later.",
        };
    }

    redirect("/dashboard");
}

export async function logout() {
    try {
        const supabase = await createClient();
        await supabase.auth.signOut();
    } catch (error) {
        console.error("Logout failed because auth is unavailable:", error);
    }

    redirect("/login");
}
