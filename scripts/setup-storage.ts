import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === "uploads");

    if (exists) {
        console.log('✓ Storage bucket "uploads" already exists.');
        return;
    }

    // Create the bucket
    const { data, error } = await supabase.storage.createBucket("uploads", {
        public: false,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: [
            "text/csv",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/pdf",
        ],
    });

    if (error) {
        console.error("Failed to create bucket:", error.message);
        process.exit(1);
    }

    console.log('✓ Storage bucket "uploads" created successfully.');
}

main();
