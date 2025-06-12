import { NextRequest, NextResponse } from "next/server";
import { pinecone } from "@/lib/pinecone";
import cohere from "@/lib/cohere";
import { ai } from "@/lib/gemini";

export async function POST(req: NextRequest) {
    try {
        const { question, videoId, stepIndex } = await req.json();

        if (!question || !videoId) {
            return NextResponse.json({ error: "Missing question or videoId" }, { status: 400 });
        }

        //Embed the user's question as a search query
        const embedRes = await cohere.embed({
            model: "embed-english-v3.0",
            texts: [question],
            inputType: "search_query",
        });

        let questionEmbedding: number[] | null = null;

        if (Array.isArray(embedRes.embeddings)) {
            questionEmbedding = embedRes.embeddings[0];
        } else if ("search_query" in embedRes.embeddings) {
            const queryEmbeds = embedRes.embeddings["search_query"] as number[][];
            questionEmbedding = queryEmbeds?.[0];
        }
          

        if (!questionEmbedding) {
            return NextResponse.json({ error: "Failed to generate question embedding" }, { status: 500 });
        }
          

        // Query Pinecone in the cook namespace
        const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
        const result = await index.namespace(`cook-${videoId}`).query({
            vector: questionEmbedding,
            topK: 5,
            includeMetadata: true,
        });

        const chunks = result.matches
            ?.map((m) => m.metadata?.text)
            .filter(Boolean)
            .slice(0, 5)
            .join("\n\n");

        if (!chunks) {
            return NextResponse.json({ error: "No relevant transcript found" }, { status: 404 });
        }

        // Gemini prompt
        const prompt = `
You are a helpful cooking assistant. Answer the user's question using the recipe steps below.

User's question:
"${question}"

Relevant recipe steps:
${chunks}

Keep your answer simple, helpful, and beginner-friendly.
`.trim();

        const geminiRes = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        const answer = geminiRes.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!answer) {
            return NextResponse.json({ error: "No response from Gemini" }, { status: 500 });
        }

        return NextResponse.json({ answer });
    } catch (err) {
        console.error("Doubt resolver error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
