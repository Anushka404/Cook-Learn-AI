import { NextRequest, NextResponse } from "next/server";
import { getVectorStore } from "@/lib/vectorStore";
import { OPENROUTER_MODEL, chatCompletionWithRetry } from "@/lib/openrouter";
import { apiGuard } from "@/lib/ratelimit";

// LLMs sometimes wrap JSON in ``` fences or add stray prose. Try a direct parse, then
// fall back to the first {...} block before giving up.
function parseRecipeJson(raw: string): any | null {
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    try {
        return JSON.parse(cleaned);
    } catch {
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        if (start !== -1 && end > start) {
            try {
                return JSON.parse(cleaned.slice(start, end + 1));
            } catch {
                return null;
            }
        }
        return null;
    }
}

export async function POST(req: NextRequest) {
    const guard = await apiGuard("llm");
    if (guard instanceof NextResponse) return guard;

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

            // Vector search returns chunks by relevance, NOT by time. Sort by start timestamp
            // so the recipe is reassembled chronologically and steps stay in sequence.
            chunks = docs
                .filter((doc) => doc.pageContent)
                .sort((a, b) => (Number(a.metadata?.start) || 0) - (Number(b.metadata?.start) || 0))
                .map((doc) => doc.pageContent);
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

        let completion;
        try {
            completion = await chatCompletionWithRetry({
                model: OPENROUTER_MODEL,
                messages: [
                    { role: "system", content: "You are a helpful cooking assistant that extracts recipes from transcripts and outputs strict JSON." },
                    { role: "user", content: prompt }
                ],
            }, { label: "summarize-cook" });
        } catch (err) {
            console.error("OpenRouter call failed:", err);
            return NextResponse.json({ error: "AI service unavailable, please retry" }, { status: 503 });
        }

        const raw = completion.choices[0]?.message?.content || "";
        const json = parseRecipeJson(raw);
        if (!json) {
            console.error("Invalid JSON from OpenRouter:", raw);
            return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
        }
        return NextResponse.json(json);
    } catch (error) {
        console.error("Error summarizing cooking recipe:", error);
        return NextResponse.json({ error: "Server error while summarizing" }, { status: 500 });
    }
}