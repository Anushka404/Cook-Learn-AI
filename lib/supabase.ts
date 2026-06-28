import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service-role key. NEVER import this into a
// client component — the service key bypasses RLS and must stay on the server.
// Access is gated by apiGuard() (Clerk auth) in the API routes that use this, and
// every query is manually scoped by the Clerk userId.
//
// If the env isn't set we export null so routes can return 503 instead of crashing.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
    console.warn("[supabase] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — DB features disabled.");
}

export const supabase =
    url && serviceKey
        ? createClient(url, serviceKey, { auth: { persistSession: false } })
        : null;
