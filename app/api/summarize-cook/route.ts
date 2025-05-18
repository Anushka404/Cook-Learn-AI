import { NextRequest, NextResponse } from "next/server";
import { pinecone } from "@/lib/pinecone";
import { ai } from "@/lib/gemini";

export async function POST(req: NextRequest) {
    try {
        const { videoId } = await req.json();
        if (!videoId) {
            return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
        }

        const pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME!);

        // Fetch embedded transcript chunks for cooking namespace
        const result = await pineconeIndex.namespace(`cook-${videoId}`).query({
            topK: 100,
            includeMetadata: true,
            vector: Array(1024).fill(0), // or a dummy vector if required
        });


        const chunks = result.matches
            .map((match) => match.metadata?.text)
            .filter(Boolean) as string[];

        if (chunks.length === 0) {
            return NextResponse.json({ error: "No transcript found" }, { status: 404 });
        }

        const joinedTranscript = chunks.join("\n\n");
        const prompt = `
You're a recipe assistant. Given this cooking video transcript, extract:
1. The **recipe title**
2. A **2–3 line enticing summary** of the dish
3. A list of **ingredients**
4. Step-by-step **instructions** (each step clear and short)

Transcript:
""" 
${joinedTranscript}
"""

Return JSON:
{
  "title": "...",
  "summary": "...",
  "ingredients": ["..."],
  "steps": ["Step 1...", "Step 2...", ...]
}
`;


        // Gemini call using the ai.models.generateContent() format
        const geminiRes = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        const textOutput = geminiRes.candidates?.[0]?.content?.parts?.[0]?.text || "";

        try {
            const json = JSON.parse(textOutput);
            return NextResponse.json(json);
        } catch (err) {
            console.error("Invalid JSON from Gemini:", textOutput);
            return NextResponse.json({ error: "Failed to parse Gemini response" }, { status: 500 });
        }
    } catch (error) {
        console.error("Error summarizing cooking recipe:", error);
        return NextResponse.json({ error: "Server error while summarizing" }, { status: 500 });
    }
}