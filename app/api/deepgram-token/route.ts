import { createClient } from "@deepgram/sdk";
import { NextResponse } from "next/server";
import { apiGuard } from "@/lib/ratelimit";

export async function GET() {
    const guard = await apiGuard("standard");
    if (guard instanceof NextResponse) return guard;

    const apiKey = process.env.DEEPGRAM_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: "Deepgram API key not configured" },
            { status: 500 }
        );
    }

    try {
        const deepgram = createClient(apiKey);

        // Mint a short-lived scoped token instead of leaking the raw API key.
        // 300s is enough to open the live WebSocket; the connection stays up after.
        const { result, error } = await deepgram.auth.grantToken({ ttl_seconds: 300 });

        if (error || !result?.access_token) {
            console.error("Deepgram grantToken failed:", error);
            return NextResponse.json({ error: "Failed to mint token" }, { status: 500 });
        }

        return NextResponse.json({
            access_token: result.access_token,
            expires_in: result.expires_in,
        });
    } catch (err) {
        console.error("Deepgram token error:", err);
        return NextResponse.json({ error: "Failed to mint token" }, { status: 500 });
    }
}
