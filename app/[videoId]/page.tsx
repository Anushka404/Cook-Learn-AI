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
    const [question, setQuestion] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [answer, setAnswer] = useState("");
    const [answerLoading, setAnswerLoading] = useState(false);


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

                    await fetch("/api/embed", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            transcript: data.transcript,
                            videoId: videoId,
                        }),
                    });
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


    const handleQuery = async () => {
        const res = await fetch("/api/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                question,
                videoId: "your_video_id_here", 
            }),
        });

        const data = await res.json();
        setResults(data.results || []);
    };


    const handleAnswer = async () => {
        try {
            setAnswerLoading(true);
            setAnswer("");

            const res = await fetch("/api/answer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question, videoId }),
            });

            const data = await res.json();
            setAnswer(data.answer || "No answer returned.");
        } catch (err) {
            console.error("Error getting answer:", err);
            setAnswer(" Failed to generate answer.");
        } finally {
            setAnswerLoading(false);
        }
    };

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

            <div className="mt-10 p-4 border rounded bg-white dark:bg-zinc-900">
                <h2 className="text-xl font-semibold">🔎 Ask a Question</h2>

                <input
                    className="w-full border p-2 rounded mt-2 text-white"
                    placeholder="e.g., What is osmosis?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                />

                <button
                    onClick={handleQuery}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded"
                >
                    Search
                </button>
                <button
                    onClick={handleAnswer}
                    className="ml-3 mt-3 px-4 py-2 bg-green-600 text-white rounded hover:cursor-pointer"
                >
                    Get AI Answer
                </button>

                {answerLoading && <p className="mt-3 text-sm text-gray-400">Gemini is thinking...</p>}

                {answer && (
                    <div className="mt-4 p-4 bg-green-50 border rounded text-black dark:bg-zinc-800 dark:text-white">
                        <h4 className="font-semibold mb-1">💡 Gemini's Answer:</h4>
                        <p className="whitespace-pre-wrap text-sm">{answer}</p>
                    </div>
                )}


                {results.length > 0 && (
                    <div className="mt-6">
                        <h3 className="font-medium mb-2">📋 Top Matches:</h3>
                        <ul className="space-y-2">
                            {results.map((r, i) => (
                                <li key={i} className="p-2 border rounded bg-gray-50 dark:bg-zinc-800">
                                    <p><strong>Timestamp:</strong> {r.start ? `${Math.floor(r.start / 60)}:${String(Math.floor(r.start % 60)).padStart(2, "0")}` : "?"}</p>
                                    <p>{r.text}</p>
                                    <p className="text-sm text-gray-500">Score: {r.score?.toFixed(3)}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
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

