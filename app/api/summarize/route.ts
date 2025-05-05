import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/gemini";
import { chunkTranscript } from "@/lib/splitter";

function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}


export async function POST(req: NextRequest) {
    const { transcript } = await req.json();

    const chunks = chunkTranscript(transcript).slice(0, 3); // for testing, limit to 3 chunks
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


        try {
            const res = await ai.models.generateContent({
                model: "gemini-1.5-pro",
                contents: prompt,
            });
            summaries.push({
                timestamp,
                output: res.text,
            });
            await new Promise((r) => setTimeout(r, 1500)); // 1.5s delay
        } catch (error) {
            console.error("Error generating summary:", error);
            summaries.push({
                timestamp,
                output: "Summary failed.",
            });
        }
    }
    return NextResponse.json({ summaries });
}

