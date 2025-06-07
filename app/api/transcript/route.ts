import { NextResponse, NextRequest } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

export async function POST(req: NextRequest) {
    try {
        const { videoId } = await req.json();
        if (!videoId)
            return NextResponse.json({ error: 'Missing video ID' }, { status: 400 });

        const rawTranscript = await YoutubeTranscript.fetchTranscript(videoId);

        const cleaned = (rawTranscript as any[]).map((item) => ({
            text: item.text,
            start: item.offset ?? 0,
            duration: Number(item.duration) ?? 0,
        }));
        console.log(`Fetched transcript for video ${videoId}:`, cleaned);

        return NextResponse.json({ transcript: cleaned });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Failed to fetch transcript' }, { status: 500 });
    }
}