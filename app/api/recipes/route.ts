import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/ratelimit";
import { supabase } from "@/lib/supabase";

// GET /api/recipes — list the signed-in user's saved recipes (metadata only).
export async function GET() {
    const guard = await apiGuard("standard");
    if (guard instanceof NextResponse) return guard;
    if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

    const { data, error } = await supabase
        .from("saved_recipes")
        .select("video_id, title, thumbnail, created_at")
        .eq("user_id", guard.userId)
        .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ recipes: data ?? [] });
}

// POST /api/recipes — save (upsert) a recipe for the signed-in user.
export async function POST(req: NextRequest) {
    const guard = await apiGuard("standard");
    if (guard instanceof NextResponse) return guard;
    if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 503 });

    const { videoId, title, thumbnail, recipe, checkedIngredients } = await req.json();
    if (!videoId || !recipe) {
        return NextResponse.json({ error: "videoId and recipe are required" }, { status: 400 });
    }

    const { error } = await supabase
        .from("saved_recipes")
        .upsert(
            {
                user_id: guard.userId,
                video_id: videoId,
                title,
                thumbnail,
                recipe,
                mode: "cook",
                checked_ingredients: Array.isArray(checkedIngredients) ? checkedIngredients : [],
            },
            { onConflict: "user_id,video_id" }
        );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
