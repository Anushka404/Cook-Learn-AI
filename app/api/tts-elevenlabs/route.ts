import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const { text } = await req.json();

    if (!text) {
        return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;

    try {
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "xi-api-key": apiKey!,
                "Accept": "audio/mpeg",
            },
            body: JSON.stringify({
                text,
                model_id: "eleven_multilingual_v2",
                output_format: "mp3_44100_128",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            }),
        });
        const contentType = res.headers.get("Content-Type");
        console.log("🎧 ElevenLabs response headers:", contentType);

        if (!res.ok || !contentType?.includes("audio/mpeg")) {
            const error = await res.json();
            console.error("❌ ElevenLabs Error Response:", error);
            return NextResponse.json({ error: error.message || "ElevenLabs TTS failed" }, { status: 500 });
          }
        const audioBuffer = await res.arrayBuffer();
      
        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Disposition": 'inline; filename="speech.mp3"',
            },
        });
    } catch (err) {
        console.error("TTS Error:", err);
        return NextResponse.json({ error: "Failed to generate speech" }, { status: 500 });
    }
      }