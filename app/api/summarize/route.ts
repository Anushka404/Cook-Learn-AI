import { NextRequest, NextResponse } from "next/server";
import { openrouter, OPENROUTER_MODEL } from "@/lib/openrouter";
import { chunkTranscript } from "@/lib/splitter";

function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}


const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

export async function POST(req: NextRequest) {
    const { transcript } = await req.json();

    const chunks = chunkTranscript(transcript);
    const summaries = [];

    for (let i = 0; i < chunks.length; i++) {
        const text = chunks[i].text.trim();
        const timestamp = transcript[i]?.start ?? 0;
        const prompt = `
You are a helpful assistant that summarizes educational lectures for students.


Given a transcript chunk from a YouTube lecture (with a timestamp range), perform the following:

1. Identify and return a clear topic title summarizing the main idea.
2. Write a 2–3 paragraph summary explaining the concept in simple language, like a class note.
3. If possible, include:
   - Key definitions
   - Examples
   - Important terms
   - Cause/effect relationships

**Format:**

Timestamp: ${formatTime(timestamp)}  
Topic: <Your Topic Title>  

Summary:  
<2–3 paragraph summary>

Key Points:
- <Bullet 1>
- <Bullet 2>
- <Important definition or example>

Transcript:  
${text}
`.trim();


        let success = false;
        for (let attempt = 0; attempt < MAX_RETRIES && !success; attempt++) {
            try {
                const completion = await openrouter.chat.completions.create({
                    model: OPENROUTER_MODEL,
                    messages: [{ role: "user", content: prompt }],
                });
                summaries.push({
                    timestamp,
                    output: completion.choices[0]?.message?.content,
                });
                success = true;

                // Small delay between chunks to avoid rate limits
                if (i < chunks.length - 1) {
                    await new Promise((r) => setTimeout(r, BASE_DELAY_MS));
                }
            } catch (error: any) {
                const isRateLimit = error?.status === 429 || error?.message?.includes("429");
                if (isRateLimit && attempt < MAX_RETRIES - 1) {
                    const backoff = BASE_DELAY_MS * Math.pow(2, attempt + 1);
                    console.warn(`Rate limited on chunk ${i}, retrying in ${backoff}ms (attempt ${attempt + 1})`);
                    await new Promise((r) => setTimeout(r, backoff));
                } else {
                    console.error(`Error generating summary for chunk ${i}:`, error);
                    summaries.push({
                        timestamp,
                        output: "Summary failed.",
                    });
                    success = true; // move on to next chunk
                }
            }
        }
    }
    return NextResponse.json({ summaries });
}

