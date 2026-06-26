import { NextRequest, NextResponse } from "next/server";
import { openrouter, OPENROUTER_MODEL } from "@/lib/openrouter";
import { chunkTranscript } from "@/lib/splitter";

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 2000;
// Cap on simultaneous LLM calls. Keeps the free-tier from 429-ing while still being
// far faster than one-at-a-time. Tune up if the provider allows more throughput.
const CONCURRENCY = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Worth retrying: rate limits (429), server errors (5xx), and transient network drops
// (ECONNRESET/ETIMEDOUT etc.) — the free OpenRouter endpoint resets connections often.
function isRetryable(error: any): boolean {
    const status = error?.status;
    const code = error?.code || error?.errno;
    const msg = error?.message || "";
    const isRateLimit = status === 429 || msg.includes("429");
    const isServerErr = typeof status === "number" && status >= 500;
    const isNetwork =
        ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EPIPE", "EAI_AGAIN"].includes(code) ||
        error?.type === "system" ||
        /ECONNRESET|ETIMEDOUT|fetch failed|network|socket hang up/i.test(msg);
    return isRateLimit || isServerErr || isNetwork;
}

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
    const { transcript } = await req.json();

    const chunks = chunkTranscript(transcript);
    // Fixed-size array so results stay in chunk order regardless of which finishes first.
    const summaries: { timestamp: number; output: string }[] = new Array(chunks.length);

    // Summarize one chunk, retrying only on rate limits (429) with exponential backoff.
    async function summarizeChunk(i: number) {
        const timestamp = chunks[i].start;
        const prompt = buildPrompt(chunks[i].text.trim());

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const completion = await openrouter.chat.completions.create({
                    model: OPENROUTER_MODEL,
                    messages: [{ role: "user", content: prompt }],
                });
                summaries[i] = { timestamp, output: completion.choices[0]?.message?.content ?? "" };
                return;
            } catch (error: any) {
                if (isRetryable(error) && attempt < MAX_RETRIES - 1) {
                    const backoff = BASE_DELAY_MS * Math.pow(2, attempt);
                    console.warn(`Chunk ${i} failed (${error?.code || error?.status || "error"}), retrying in ${backoff}ms (attempt ${attempt + 1})`);
                    await sleep(backoff);
                } else {
                    console.error(`Error generating summary for chunk ${i}:`, error);
                    summaries[i] = { timestamp, output: "Summary failed." };
                    return;
                }
            }
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

