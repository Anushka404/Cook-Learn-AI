import { NextRequest, NextResponse } from "next/server";
import { ai } from "@/lib/gemini"; 

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();

        if (!text || typeof text !== "string") {
            return NextResponse.json({ error: "Missing or invalid text" }, { status: 400 });
        }

        const prompt = `
You are a smart voice command classifier in a cooking assistant app.

Classify the following user voice input:
"${text}"

If it is a direct question (like a cooking doubt), answer with: doubt  
If it is a known voice command (like next, repeat, pause), answer with: command  
Only reply with "doubt" or "command" — nothing else.
        `.trim();

        const geminiRes = await ai.models.generateContent({
            model: "gemini-2.0-flash", 
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });

        const raw = geminiRes.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase() || "";
        const intent = raw.includes("doubt") ? "doubt" : "command";

        return NextResponse.json({ intent });
    } catch (err) {
        console.error("Intent classification error:", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
