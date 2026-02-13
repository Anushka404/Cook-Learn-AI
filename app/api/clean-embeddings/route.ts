import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const videoId = searchParams.get("videoId");
        const mode = searchParams.get("mode");

        if (!videoId || !mode) {
            return NextResponse.json({ error: "Missing videoId or mode" }, { status: 400 });
        }

        const namespace = `${mode}-${videoId}`;
        const client = await getRedisClient();

        const keys = await client.keys(`${namespace}:*`);

        if (keys.length === 0) {
            return NextResponse.json({ success: true, count: 0, message: "No embeddings found" });
        }
        await client.del(keys);

        console.log(`Deleted ${keys.length} keys for ${namespace}`);
        return NextResponse.json({ success: true, count: keys.length });

    } catch (err: any) {
        console.error("Error cleaning embeddings:", err);
        return NextResponse.json({ error: "Cleanup failed", details: err.message }, { status: 500 });
    }
}
