import { NextRequest, NextResponse } from "next/server";
import cohere from "@/lib/cohere";
import { pinecone } from "@/lib/pinecone";
import { ai } from "@/lib/gemini";

export async function POST(req: NextRequest) {
    try {
        const { question, videoId } = await req.json();

        const embedRes = await cohere.embed({
            model: "embed-english-v3.0",
            texts: [question],
            inputType: "search_query",
        });

        const [queryEmbedding] = embedRes.embeddings as number[][];

        // Query Pinecone for top transcript chunks
        const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
        const pineconeRes = await index.query({
            topK: 8,
            vector: queryEmbedding,
            includeMetadata: true,
            filter: { videoId },
        });

        const contextChunks = pineconeRes.matches
            ?.map((m) => m.metadata?.text)
            .filter(Boolean)
            .join("\n\n");

        const prompt = [
            {
                role: "user",
                parts: [
                    {
                        text: `You are a helpful AI tutor. Use the transcript chunks provided to answer the user's question clearly and concisely. Only use relevant information. If the answer is not in the transcript, say: "The transcript does not provide a direct answer to that question."`
                    }
                ]
            },
            {
                role: "user",
                parts: [
                    {
                        text: `Transcript Chunks:\n${contextChunks}\n\nQuestion: ${question}`
                    }
                ]
            }
        ];

        const geminiRes = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
        });

        return NextResponse.json({ answer: geminiRes.text });
    } catch (err) {
        console.error("Error in /api/answer:", err);
        return NextResponse.json({ error: "Failed to generate answer" }, { status: 500 });
    }
}
