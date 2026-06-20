import { NextRequest, NextResponse } from "next/server";
import { getVectorStore } from "@/lib/vectorStore";
import { openrouter, OPENROUTER_MODEL } from "@/lib/openrouter";

export async function POST(req: NextRequest) {
    try {
        const { question, videoId } = await req.json();

        if (!question || !videoId) {
            return NextResponse.json({ error: "Missing question or videoId" }, { status: 400 });
        }

        const vectorStore = await getVectorStore(`cook-${videoId}`);

        // similaritySearch embeds the query + retrieves top docs in one call
        const docs = await vectorStore.similaritySearch(question, 5);

        const chunks = docs
            .map((doc) => doc.pageContent)
            .filter(Boolean)
            .slice(0, 5)
            .join("\n\n");

        if (!chunks)
            return NextResponse.json({ error: "No relevant transcript found" }, { status: 404 });

        // Prompt
        const prompt = `
You are a friendly and clear cooking assistant. Answer the user's question based on the recipe steps below.

User's question:
"${question}"

Relevant recipe steps:
${chunks}

Guidelines for your answer:
- Write short, spoken-friendly sentences (max 15 words)
- Use clear language suitable for beginners
- Do NOT use markdown or formatting symbols like **, _, etc.
- Add pauses naturally by using punctuation (periods, commas, line breaks)
- Avoid technical terms unless you explain them simply

Now answer helpfully and naturally.
`.trim();

        const stream = await openrouter.chat.completions.create({
            model: OPENROUTER_MODEL,
            messages: [{ role: "user", content: prompt }],
            stream: true,
        });

        const encoder = new TextEncoder();

        const readable = new ReadableStream({
            async start(controller) {
                for await (const chunk of stream) {
                    const text = chunk.choices[0]?.delta?.content;
                    if (text)
                        controller.enqueue(encoder.encode(text));
                }
                controller.close();
            },
        });

        return new NextResponse(readable, {
            headers: {
                "Content-Type": "text/plain",
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        });

    } catch (err) {
        console.error("Doubt resolver error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
