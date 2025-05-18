import { NextRequest, NextResponse } from "next/server";
import cohere from "@/lib/cohere";
import { pinecone } from "@/lib/pinecone";

export async function POST(req: NextRequest) {
    try {
        //embed the question
        const { question, videoId } = await req.json();

        const embedResponse = await cohere.embed({
            model: "embed-english-v3.0",
            texts: [question],
            inputType: "search_query",
        });

        const queryEmbedding = embedResponse.embeddings as number[];

        // Query Pinecone for similar vectors
        const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
        const result = await index.namespace(`lecture-${videoId}`).query({
            topK: 5,
            vector: queryEmbedding,
            includeMetadata: true,
            filter: {
                videoId: videoId,
            },
        });

        // Extract the relevant chunks from the result
        const matches = result.matches?.map((match) => ({
            score: match.score,
            text: match.metadata?.text,
            start: match.metadata?.start,
        })) || [];

        return NextResponse.json({ results: matches });
    } catch (err) {
        console.error("Error in /api/query:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}