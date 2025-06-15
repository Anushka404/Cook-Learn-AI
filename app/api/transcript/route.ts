import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { videoId } = await req.json();
        if (!videoId) 
            return NextResponse.json({ error: 'Missing video ID' }, { status: 400 });

        const url = `https://youtube-transcript3.p.rapidapi.com/api/transcript?videoId=${videoId}`;

        const options = {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!,
                'X-RapidAPI-Host': 'youtube-transcript3.p.rapidapi.com',
            },
        };

        const response = await fetch(url, options);

        if (!response.ok) 
            return NextResponse.json({ error: 'RapidAPI request failed' }, { status: response.status });

        const result = await response.json();

        if (!result || !result.transcript) 
            return NextResponse.json({ error: 'Transcript not available' }, { status: 404 });

        console.log("Transcript preview:", result.transcript.slice(0, 2));

        return NextResponse.json({ transcript: result.transcript });
    } catch (error: any) {
        console.error("Error fetching transcript from RapidAPI:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
