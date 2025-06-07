import { createClient } from '@deepgram/sdk';
import { NextRequest, NextResponse } from 'next/server';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

export async function POST(req: NextRequest) {
    try {
        const { audio } = await req.json();
        const buffer = Buffer.from(audio, 'base64');

        const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
            buffer,
            { model: 'nova', smart_format: true }
        );

        const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
        return NextResponse.json({ transcript });
    } catch (err) {
        console.error('[Deepgram Error]', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
