import { NextRequest, NextResponse } from "next/server";
import { getVectorStore } from "@/lib/vectorStore";
import { openrouter, OPENROUTER_MODEL } from "@/lib/openrouter";

export async function POST(req: NextRequest) {
    try {
        const { videoId } = await req.json();
        if (!videoId) {
            return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
        }

        const namespace = `cook-${videoId}`;
        console.log("Summarizing cook for video:", videoId);
        console.log("Querying Redis namespace:", namespace);

        let chunks: string[] = [];
        try {
            const vectorStore = await getVectorStore(namespace);

            // Broad query to retrieve all transcript chunks for this video
            const docs = await vectorStore.similaritySearch(
                "cooking recipe steps ingredients instructions",
                100,
            );

            chunks = docs
                .map((doc) => doc.pageContent)
                .filter(Boolean);
        } catch (queryErr) {
            console.error("Redis query failed (vectors may not be indexed yet):", queryErr);
            return NextResponse.json({ error: "Transcript not yet indexed, please retry" }, { status: 404 });
        }

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
  "steps": [
    {
      "step": "Chop the onions finely.",
      "timestamp": 43.5
    },
     ...
  ]
}
`;

        const completion = await openrouter.chat.completions.create({
            model: OPENROUTER_MODEL,
            messages: [
                { role: "system", content: "You are a helpful cooking assistant that extracts recipes from transcripts and outputs strict JSON." },
                { role: "user", content: prompt }
            ],
        });

        let textOutput = completion.choices[0]?.message?.content || "";
        // Clean markdown JSON blocks if present (common in LLM output)
        textOutput = textOutput.trim().replace(/^```json\s*/, "").replace(/```$/, "");

        try {
            const json = JSON.parse(textOutput);
            return NextResponse.json(json);
        } catch (err) {
            console.error("Invalid JSON from OpenRouter:", err, textOutput);
            return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
        }
    } catch (error) {
        console.error("Error summarizing cooking recipe:", error);
        return NextResponse.json({ error: "Server error while summarizing" }, { status: 500 });
    }
}