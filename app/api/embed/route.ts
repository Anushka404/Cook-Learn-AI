import { NextRequest, NextResponse } from "next/server";
import { chunkTranscript } from "@/lib/splitter";
import cohere from "@/lib/cohere";
import { pinecone } from "@/lib/pinecone";

export async function POST(req: NextRequest) {
    const { transcript, videoId } = await req.json();
    const chunks = chunkTranscript(transcript);

    const texts = chunks.map((chunk) => chunk.text.trim());

    const response = await cohere.embed({
        model: "embed-english-v3.0",
        texts: texts,
        inputType: "search_document",
    });
    
    const embeddings = response.embeddings as number[][];

    // format for pinecone
    const vectors = embeddings.map((embedding: number[], i: number) => ({
        id: `${videoId}_chunk_${i}`,
        values: embedding,
        metadata: {
            text: texts[i],
            videoId,
            start: chunks[i].start,
            end: chunks[i].end,
         },
    }));

    const pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME!); 
    await pineconeIndex.upsert(vectors);

    return NextResponse.json({ success: true, count: vectors.length });
}