import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
    const guard = await apiGuard("tts");
    if (guard instanceof NextResponse) return guard;

    try {
        // 1. Parse Request Body
        const { text, lang = "en" } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        let audioBuffer: ArrayBuffer | null = null;
        const contentType = "audio/mpeg";

        // 2. Try Deepgram TTS first (Better quality, supports longer text)
        const apiKey = process.env.DEEPGRAM_API_KEY;
        if (apiKey) {
            try {
                const deepgramUrl = `https://api.deepgram.com/v1/speak?model=aura-2-thalia-en`;
                const dgResponse = await fetch(deepgramUrl, {
                    method: "POST",
                    headers: {
                        "Authorization": `Token ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ text }),
                });

                if (dgResponse.ok) {
                    audioBuffer = await dgResponse.arrayBuffer();
                    // Deepgram returns mp3/wav/flac etc based on request. Default mp3?
                    // Actually defaults to mp3.
                } else {
                    console.warn(`Deepgram TTS failed (${dgResponse.status}), falling back to Google.`);
                }
            } catch (dgError) {
                console.warn("Deepgram TTS error, falling back to Google:", dgError);
            }
        }

        // 3. Fallback to Google TTS (Unofficial, fragile, length limits)
        if (!audioBuffer) {
            // Google TTS unofficial limit is around 200 chars. We must truncate to avoid 500.
            // A better approach would be splitting, but let's truncate for crash prevention as a fallback.
            const safeText = text.substring(0, 200);
            if (text.length > 200) console.warn("Truncating text for Google TTS fallback.");

            const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(safeText)}&tl=${lang}&client=tw-ob`;

            const gResponse = await fetch(googleUrl, {
                headers: { "User-Agent": "Mozilla/5.0" },
            });

            if (!gResponse.ok) {
                const errText = await gResponse.text();
                throw new Error(`Google TTS failed (${gResponse.status}): ${errText}`);
            }

            audioBuffer = await gResponse.arrayBuffer();
        }

        if (!audioBuffer) {
            throw new Error("No audio buffer generated.");
        }

        // 4. Return Audio Response
        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Length": audioBuffer.byteLength.toString(),
                "Content-Disposition": 'inline; filename="speech.mp3"',
            },
        });

    } catch (err: any) {
        console.error("TTS API Error:", err);
        return NextResponse.json({ error: "TTS generation failed", details: err.message }, { status: 500 });
    }
}
