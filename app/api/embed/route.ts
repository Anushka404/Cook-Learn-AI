import { NextRequest, NextResponse } from "next/server";
import { chunkTranscript } from "@/lib/splitter";
import { getVectorStore } from "@/lib/vectorStore";
import { getRedisClient } from "@/lib/redis";
import { Document } from "@langchain/core/documents";

export async function POST(req: NextRequest) {
    try {
        const { transcript, videoId, mode = "lecture" } = await req.json();

        if (!transcript?.length || !videoId) {
            return NextResponse.json({ error: "Missing transcript or videoId" }, { status: 400 });
        }

        const namespace = `${mode}-${videoId}`;
        console.log("Embedding for namespace:", namespace);

        // Check if already exists
        const client = await getRedisClient();
        const existingKeys = await client.keys(`${namespace}:*`);

        if (existingKeys.length > 0) {
            console.log(`Video ${videoId} already embedded (${existingKeys.length} docs). Skipping.`);
            return NextResponse.json({ success: true, count: existingKeys.length, message: "Already embedded" });
        }

        console.log("Transcript length:", transcript.length);

        const chunks = chunkTranscript(transcript);
        const texts = chunks.map((chunk) => chunk.text.trim());

        if (!texts.length) {
            return NextResponse.json({ error: "Transcript resulted in empty chunks" }, { status: 400 });
        }

        // Convert chunks to LangChain Documents
        const docs = chunks.map((chunk, i) => new Document({
            pageContent: texts[i],
            metadata: {
                videoId,
                start: chunk.start,
                end: chunk.end,
                mode,
            },
        }));

        // addDocuments handles embedding + storing in Redis in one call
        const vectorStore = await getVectorStore(namespace);
        await vectorStore.addDocuments(docs);

        console.log(`Stored ${docs.length} documents in ${namespace}`);

        return NextResponse.json({ success: true, count: docs.length });
    } catch (err) {
        console.error("Error in /api/embed:", err);
        return NextResponse.json({ error: "Failed to embed transcript", details: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
