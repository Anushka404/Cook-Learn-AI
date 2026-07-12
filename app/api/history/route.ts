import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/ratelimit";
import { supabase } from "@/lib/supabase";

const COLS = "video_id, title, thumbnail, last_step_index, total_steps, status, updated_at";

// GET /api/history            — list the user's cooking history (newest first)
// GET /api/history?videoId=X  — single row for one video (for resume), or null
export async function GET(req: NextRequest) {
    const guard = await apiGuard("standard");
    if (guard instanceof NextResponse) return guard;
    if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

    const videoId = req.nextUrl.searchParams.get("videoId");

    if (videoId) {
        const { data, error } = await supabase
            .from("cook_history")
            .select(COLS)
            .eq("user_id", guard.userId)
            .eq("video_id", videoId)
            .maybeSingle();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ history: data });
    }

    const { data, error } = await supabase
        .from("cook_history")
        .select(COLS)
        .eq("user_id", guard.userId)
        .order("updated_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ history: data ?? [] });
}

// POST /api/history — upsert progress for a video. Partial: only provided fields change.
export async function POST(req: NextRequest) {
    const guard = await apiGuard("standard");
    if (guard instanceof NextResponse) return guard;
    if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

    const { videoId, title, thumbnail, lastStepIndex, totalSteps, status } = await req.json();
    if (!videoId) return NextResponse.json({ error: "videoId required" }, { status: 400 });

    const row: Record<string, unknown> = {
        user_id: guard.userId,
        video_id: videoId,
        updated_at: new Date().toISOString(),
    };
    if (title !== undefined) row.title = title;
    if (thumbnail !== undefined) row.thumbnail = thumbnail;
    if (typeof lastStepIndex === "number") row.last_step_index = lastStepIndex;
    if (typeof totalSteps === "number") row.total_steps = totalSteps;
    if (status) {
        row.status = status;
        if (status === "completed") row.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
        .from("cook_history")
        .upsert(row, { onConflict: "user_id,video_id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
