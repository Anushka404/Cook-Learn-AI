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
                            mode: "lecture",
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
        <div className="min-h-screen bg-[#D7B6FF] px-4 py-10 font-sans space-y-12">
            {/* Section: Transcript */}
            <div className="mx-auto max-w-4xl bg-white border-4 border-black rounded-xl p-6 shadow space-y-6">
                <h1 className="text-2xl font-mono font-bold text-[#1F1F1F]">📜 Transcript</h1>

                {loading ? (
                    <p className="text-gray-600">Loading transcript...</p>
                ) : (
                    <div className="space-y-4">
                        {transcript.map((chunk, index) => (
                            <div
                                key={index}
                                className="bg-[#FDFDFD] border border-gray-300 rounded-md p-3 shadow-sm font-montserrat text-gray-800"
                            >
                                {chunk.text}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Section: AI Summary */}
            <div className="mx-auto max-w-4xl bg-white border-4 border-black rounded-xl p-6 shadow space-y-6">
                <h2 className="text-2xl font-mono font-bold text-[#1F1F1F]">🧠 AI Summary</h2>

                {summarizing ? (
                    <p className="text-gray-600">Summarizing transcript...</p>
                ) : summaries?.length > 0 ? (
                    <div className="space-y-4">
                        {summaries.map((s, index) => (
                            <div
                                key={index}
                                className="p-4 bg-[#FFFDD0] border border-yellow-300 rounded font-montserrat text-gray-900"
                            >
                                <pre className="whitespace-pre-wrap text-sm">{s.output}</pre>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">No summaries available.</p>
                )}
            </div>

            {/*Section: Ask Gemini */}
            <div className="mx-auto max-w-4xl bg-white border-4 border-black rounded-xl p-6 shadow space-y-4">
                <h2 className="text-2xl font-mono font-bold text-[#1F1F1F]">🔎 Ask a Question (In Progress)</h2>

                <input
                    className="w-full p-3 border border-black rounded-md font-montserrat mt-2 bg-[#FFF0F5] text-black placeholder:text-gray-500"
                    placeholder="e.g., What does it mean by...?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                />

                <div className="flex gap-4 flex-wrap mt-3">
                    <button
                        onClick={handleQuery}
                        className="px-5 py-2 rounded-full bg-[#B8F2E6] hover:bg-[#9ee3d3] text-black font-semibold shadow transition"
                    >
                        Search
                    </button>
                    <button
                        onClick={handleAnswer}
                        className="px-5 py-2 rounded-full bg-[#FFD761] hover:bg-yellow-400 text-black font-semibold shadow transition"
                    >
                        Get AI Answer
                    </button>
                </div>

                {answerLoading && (
                    <p className="mt-3 text-sm text-gray-600 font-montserrat">Gemini is thinking...</p>
                )}

                {answer && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-300 rounded font-montserrat text-black">
                        <h4 className="font-semibold mb-2">💡 Gemini&rsquo;s Answer:</h4>
                        <p className="whitespace-pre-wrap text-sm">{answer}</p>
                    </div>
                )}

                {results.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold font-mono mb-3">📋 Top Matches:</h3>
                        <ul className="space-y-3">
                            {results.map((r, i) => (
                                <li
                                    key={i}
                                    className="p-3 rounded-md bg-[#F0F8FF] border border-gray-300 font-montserrat"
                                >
                                    <p>{r.text}</p>
                                    <p className="text-sm text-gray-500">Score: {r.score?.toFixed(3)}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
      
}

// function formatTime(seconds: number | undefined): string {
//     if (typeof seconds !== "number" || isNaN(seconds)) return "--:--";
//     const mins = Math.floor(seconds / 60);
//     const secs = Math.floor(seconds % 60);
//     return `${mins}:${secs.toString().padStart(2, "0")}`;
// }

