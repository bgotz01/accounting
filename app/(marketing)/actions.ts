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
            error:
                "Authentication service is unavailable. Please try again later.",
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
        const { data, error: listError } = await admin.auth.admin.listUsers();

        if (listError) {
            throw listError;
        }

        const existingEmail = data.users?.find(
            (user) => user.email?.toLowerCase() === email.toLowerCase()
        );

        if (existingEmail) {
            return { error: "That email is already in use." };
        }

        const supabase = await createClient();
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            return { error: error.message };
        }

        return { success: "Check your email for a confirmation link." };
    } catch (error) {
        console.error("Signup failed because auth is unavailable:", error);
        return {
            error:
                "Authentication service is unavailable. Please try again later.",
        };
    }
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
