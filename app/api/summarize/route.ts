import { NextRequest, NextResponse } from "next/server";
import { OPENROUTER_MODEL, chatCompletionWithRetry } from "@/lib/openrouter";
import { chunkTranscript } from "@/lib/splitter";
import { apiGuard } from "@/lib/ratelimit";

// Cap on simultaneous LLM calls. Keeps the free-tier from 429-ing while still being
// far faster than one-at-a-time. Tune up if the provider allows more throughput.
const CONCURRENCY = 3;

function buildPrompt(text: string) {
    return `
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
}

export async function POST(req: NextRequest) {
    const guard = await apiGuard("llm");
    if (guard instanceof NextResponse) return guard;

    const { transcript } = await req.json();

    const chunks = chunkTranscript(transcript);
    // Fixed-size array so results stay in chunk order regardless of which finishes first.
    const summaries: { timestamp: number; output: string }[] = new Array(chunks.length);

    // Summarize one chunk. Transient failures are retried inside chatCompletionWithRetry;
    // if it still throws, mark just this chunk failed so the rest of the notes survive.
    async function summarizeChunk(i: number) {
        const timestamp = chunks[i].start;
        try {
            const completion = await chatCompletionWithRetry(
                {
                    model: OPENROUTER_MODEL,
                    messages: [{ role: "user", content: buildPrompt(chunks[i].text.trim()) }],
                },
                { label: `summarize chunk ${i}` }
            );
            summaries[i] = { timestamp, output: completion.choices[0]?.message?.content ?? "" };
        } catch (error) {
            console.error(`Error generating summary for chunk ${i}:`, error);
            summaries[i] = { timestamp, output: "Summary failed." };
        }
    }

    // Worker pool: up to CONCURRENCY chunks in flight at once. Each worker pulls the next
    // index until all chunks are done.
    let cursor = 0;
    async function worker() {
        while (cursor < chunks.length) {
            const i = cursor++;
            await summarizeChunk(i);
        }
    }
    await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, worker)
    );

    return NextResponse.json({ summaries });
}

