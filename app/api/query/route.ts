import { NextRequest, NextResponse } from "next/server";
import { getVectorStore } from "@/lib/vectorStore";

export async function POST(req: NextRequest) {
    try {
        const { question, videoId } = await req.json();

        const vectorStore = await getVectorStore(`lecture-${videoId}`);

        // similaritySearchWithScore embeds the query + searches in one call
        const results = await vectorStore.similaritySearchWithScore(question, 5);

        const matches = results.map(([doc, score]) => ({
            score,
            text: doc.pageContent,
            start: doc.metadata?.start,
            end: doc.metadata?.end,
        }));

        return NextResponse.json({ results: matches });
    } catch (err) {
        console.error("Error in /api/query:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}