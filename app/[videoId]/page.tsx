"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type SummaryBlock = {
    timestamp: number;
    output: string;
};

type TranscriptChunk = {
    text: string;
    start: number;
    duration: number;
};

export default function VideoPage() {
    const { videoId } = useParams<{ videoId: string }>();
    const [transcript, setTranscript] = useState<TranscriptChunk[]>([]);
    const [loading, setLoading] = useState(true);
    const [summaries, setSummaries] = useState<SummaryBlock[]>([]);
    const [summarizing, setSummarizing] = useState(false);

    useEffect(() => {
        async function fetchTranscript() {
            try {
                const res = await fetch("/api/transcript", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ videoId }),
                });
                const data = await res.json();
                if (data.transcript) {
                    setTranscript(data.transcript);
                }

                setSummarizing(true);
                const sumRes = await fetch("/api/summarize", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ transcript: data.transcript }),
                }
                )
                const sumData = await sumRes.json();
                setSummaries(sumData?.summaries || []);
                setSummarizing(false);
            
            } catch (err) {
                console.error("Error fetching transcript:", err);
            } finally {
                setLoading(false);
            }

        }

        if (videoId) fetchTranscript();
    }, [videoId]);

    return (
        <>
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Transcript for: {videoId}</h1>

            {loading ? (
                <p>Loading transcript...</p>
            ) : (
                <div className="space-y-4">
                    {transcript.map((chunk, index) => (
                        <div key={index} className="border p-3 rounded shadow-sm bg-black">
                            <p>
                                <span className="font-mono text-gray-500 mr-2">
                                    [{formatTime(chunk.start)}]
                                </span>
                                {chunk.text}
                            </p>
                        </div>
                    ))}
                </div>
            )}
            </div>
            <div className="mt-8">
                <h2 className="text-xl font-bold mb-3">🧠 AI Summary</h2>

                {summarizing ? (
                    <p>Summarizing transcript...</p>
                ) : summaries?.length > 0 ? (
                    <div className="space-y-4">
                        {summaries.map((s, index) => (
                            <div key={index} className="p-4 bg-yellow-50 rounded shadow border border-yellow-200">
                                <pre className="whitespace-pre-wrap text-sm text-gray-800">{s.output}</pre>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>No summaries available.</p>
                )}
            </div>
        </>
    );
}

function formatTime(seconds: number | undefined): string {
    if (typeof seconds !== "number" || isNaN(seconds)) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

