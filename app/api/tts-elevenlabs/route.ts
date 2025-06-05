import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const { text, lang = "en" } = await req.json(); // 🌍 Support optional `lang`

    if (!text) {
        return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    try {
        // ✅ Google Translate TTS endpoint (undocumented but public)
        const baseURL = "https://translate.google.com/translate_tts";

        // 🧠 TTS requires basic params: client, q (text), tl (target language), etc.
        const url = `${baseURL}?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;

        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0", // ⚠️ Required or Google blocks it
            },
        });

        if (!response.ok || !response.headers.get("Content-Type")?.includes("audio/mpeg")) {
            const errorText = await response.text();
            console.error("❌ Google TTS Error:", errorText);
            return NextResponse.json({ error: "Failed to fetch audio" }, { status: 500 });
        }

        const audioBuffer = await response.arrayBuffer();

        // ✅ Return audio as inline MP3
        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Disposition": 'inline; filename="speech.mp3"',
            },
        });

    } catch (err) {
        console.error("TTS Error:", err);
        return NextResponse.json({ error: "TTS generation failed" }, { status: 500 });
    }
}
