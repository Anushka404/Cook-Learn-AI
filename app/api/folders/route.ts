import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/ratelimit";
import { supabase } from "@/lib/supabase";

// GET /api/folders — list the user's folders (oldest first).
export async function GET() {
    const guard = await apiGuard("standard");
    if (guard instanceof NextResponse) return guard;
    if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

    const { data, error } = await supabase
        .from("folders")
        .select("id, name, created_at")
        .eq("user_id", guard.userId)
        .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ folders: data ?? [] });
}

// POST /api/folders — create a folder. Returns the created row.
export async function POST(req: NextRequest) {
    const guard = await apiGuard("standard");
    if (guard instanceof NextResponse) return guard;
    if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

    const { name } = await req.json();
    if (!name || typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("folders")
        .insert({ user_id: guard.userId, name: name.trim() })
        .select("id, name, created_at")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ folder: data });
}
