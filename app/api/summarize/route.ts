import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { chunkTranscript } from "@/lib/splitter";

function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}
console.log("Using OpenAI key ending with:", process.env.OPENAI_API_KEY?.slice(-4));


export async function POST(req: NextRequest) {
    try {
        const { transcript } = await req.json();

        const chunks = chunkTranscript(transcript);

        const summaries = await Promise.all(
            chunks.map(async ({ start, end, text }) => {

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

Timestamp: ${formatTime(start)} - ${formatTime(end)}  
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


                const res = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [{ role: "user", content: prompt }],
                });

                return {
                    start,
                    end,
                    output: res.choices[0].message.content,
                };
            })
        );

        return NextResponse.json({ summaries });
    } catch (err: any) {
        console.error("Error in summarization:", err);
        return NextResponse.json({ error: "Failed to summarize transcript" }, { status: 500 });
    }
}

