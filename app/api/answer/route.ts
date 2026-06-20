import { NextRequest, NextResponse } from "next/server";
import { getVectorStore } from "@/lib/vectorStore";
import { openrouter, OPENROUTER_MODEL } from "@/lib/openrouter";

export async function POST(req: NextRequest) {
    try {
        const { question, videoId } = await req.json();

        const vectorStore = await getVectorStore(`lecture-${videoId}`);

        // similaritySearch embeds the query + retrieves top docs in one call
        const docs = await vectorStore.similaritySearch(question, 8);

        const contextChunks = docs
            .map((doc) => doc.pageContent)
            .filter(Boolean)
            .join("\n\n");

        const prompt = `
You are a helpful AI tutor. Use the transcript chunks provided to answer the user's question clearly and in detail. Only use relevant information. If the answer is not in the transcript, say: "The transcript does not provide a direct answer to that question."

Transcript Chunks:
${contextChunks}

Question: ${question}
`.trim();

        const completion = await openrouter.chat.completions.create({
            model: OPENROUTER_MODEL,
            messages: [{ role: "user", content: prompt }],
        });

        return NextResponse.json({ answer: completion.choices[0]?.message?.content });
    } catch (err) {
        console.error("Error in /api/answer:", err);
        return NextResponse.json({ error: "Failed to generate answer" }, { status: 500 });
    }
}
