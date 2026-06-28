import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/ratelimit";
import { supabase } from "@/lib/supabase";

// GET /api/recipes/:videoId — single saved recipe (full JSON) for instant, free reopen.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ videoId: string }> }) {
    const guard = await apiGuard("standard");
    if (guard instanceof NextResponse) return guard;
    if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

    const { videoId } = await params;
    const { data, error } = await supabase
        .from("saved_recipes")
        .select("video_id, title, thumbnail, recipe")
        .eq("user_id", guard.userId)
        .eq("video_id", videoId)
        .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
}

// DELETE /api/recipes/:videoId — unsave.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ videoId: string }> }) {
    const guard = await apiGuard("standard");
    if (guard instanceof NextResponse) return guard;
    if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

    const { videoId } = await params;
    const { error } = await supabase
        .from("saved_recipes")
        .delete()
        .eq("user_id", guard.userId)
        .eq("video_id", videoId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
