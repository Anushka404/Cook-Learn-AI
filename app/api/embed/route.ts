import { NextRequest, NextResponse } from "next/server";
import { chunkTranscript } from "@/lib/splitter";
import cohere from "@/lib/cohere";
import { pinecone } from "@/lib/pinecone";

export async function POST(req: NextRequest) {
    try {
        const { transcript, videoId, mode = "lecture" } = await req.json();

        if (!transcript?.length || !videoId) {
            return NextResponse.json({ error: "Missing transcript or videoId" }, { status: 400 });
        }

        const namespace = `${mode}-${videoId}`;
        // console.log("Embedding for namespace:", namespace);
        // console.log("Transcript length:", transcript.length);
        // console.log("First line:", transcript[0]?.text);

        const chunks = chunkTranscript(transcript);
        const texts = chunks.map((chunk) => chunk.text.trim());

        if (!texts.length) {
            return NextResponse.json({ error: "Transcript resulted in empty chunks" }, { status: 400 });
        }

        const response = await cohere.embed({
            model: "embed-english-v3.0",
            texts,
            inputType: "search_document",
        });

        const embeddings = response.embeddings as number[][];

        const vectors = embeddings.map((embedding, i) => ({
            id: `${namespace}_chunk_${i}`,
            values: embedding,
            metadata: {
                text: texts[i],
                videoId,
                start: chunks[i].start,
                end: chunks[i].end,
                mode,
            },
        }));

        const pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME!);
        await pineconeIndex.namespace(namespace).upsert(vectors);

        console.log(`Upserted ${vectors.length} vectors to ${namespace}`);

        return NextResponse.json({ success: true, count: vectors.length });
    } catch (err) {
        console.error("Error in /api/embed:", err);
        return NextResponse.json({ error: "Failed to embed transcript" }, { status: 500 });
    }
}
