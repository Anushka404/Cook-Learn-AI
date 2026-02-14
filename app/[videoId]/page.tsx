"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { FileText, Brain, Search, Terminal } from "lucide-react";
import TruckLoader from "@/components/TruckLoader";

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
    const [activeTab, setActiveTab] = useState<"summary" | "transcript">("summary");



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
                    setLoading(false); // Transcript loaded, but summary might still be processing

                    await fetch("/api/embed", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            transcript: data.transcript,
                            videoId: videoId,
                            mode: "lecture",
                        }),
                    });

                    setSummarizing(true);
                    const sumRes = await fetch("/api/summarize", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ transcript: data.transcript }),
                    });
                    const sumData = await sumRes.json();
                    setSummaries(sumData?.summaries || []);
                }
            } catch (err) {
                console.error("Error fetching transcript:", err);
            } finally {
                setLoading(false);
                setSummarizing(false);
            }
        }

        if (videoId) fetchTranscript();
    }, [videoId]);

    const handleQuery = async () => {
        if (!question.trim()) return;
        setAnswerLoading(true); // Show loading for search too
        try {
            const res = await fetch("/api/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question,
                    videoId,
                }),
            });
            const data = await res.json();
            setResults(data.results || []);
        } catch (e) {
            console.error(e);
        } finally {
            setAnswerLoading(false);
        }
    };

    const handleAnswer = async () => {
        if (!question.trim()) return;
        try {
            setAnswerLoading(true);
            setAnswer("");
            setResults([]); // Clear previous search results to focus on answer

            const res = await fetch("/api/answer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question, videoId }),
            });

            const data = await res.json();
            setAnswer(data.answer || "No answer returned.");
        } catch (err) {
            console.error("Error getting answer:", err);
            setAnswer("Failed to generate answer.");
        } finally {
            setAnswerLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center text-center space-y-4 bg-[#E0F7FA]">
                <Image
                    src="/food.avif" // Using existing asset as placeholder background? Or maybe just color
                    alt="Loading background"
                    fill
                    className="object-cover opacity-10 z-0 blur-[2px]"
                    priority
                />
                <TruckLoader />
                <div className="text-xl font-pixeboy tracking-widest text-[#006064] animate-pulse">
                    Initializing Knowledge Base...
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen overflow-hidden bg-[#E0F2F1] px-4 py-4 font-sans text-[#263238] selection:bg-[#4DD0E1] selection:text-white flex flex-col">
            {/* Background Pattern */}
            <div className="fixed inset-0 z-0 opacity-5 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#006064 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            </div>

            <div className="max-w-7xl mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 h-full lg:h-full">

                {/* LEFT COLUMN: Video & Ask AI (Sticky) */}
                <div className="lg:col-span-6 flex flex-col gap-4 h-full overflow-hidden">
                    {/* Video Player */}
                    <div className="bg-black border-4 border-[#263238] rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] overflow-hidden shrink-0">
                        <div className="aspect-video w-full">
                            <iframe
                                src={`https://www.youtube.com/embed/${videoId}`}
                                className="w-full h-full"
                                allowFullScreen
                            />
                        </div>
                    </div>

                    {/* Ask AI Terminal */}
                    <div className="flex-1 bg-[#263238] border-4 border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] p-4 flex flex-col overflow-hidden min-h-0">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-600 shrink-0">
                            <Terminal className="text-[#4DD0E1] w-5 h-5" />
                            <h2 className="text-[#4DD0E1] font-mono text-lg font-bold tracking-wider">AI_TUTOR_TERMINAL</h2>
                        </div>

                        {/* Output Area */}
                        <div className="flex-1 overflow-y-auto font-mono text-sm space-y-4 pr-2 custom-scrollbar-dark mb-4 bg-[#1f292e] p-3 rounded-lg border border-gray-700">
                            {!answer && !results.length && (
                                <p className="text-gray-500 italic">
                                    &gt; System ready.<br />
                                    &gt; Ask me anything about the lecture...
                                </p>
                            )}

                            {answerLoading && (
                                <div className="flex items-center gap-2 text-[#FFD761]">
                                    <span className="animate-pulse">Processing Query...</span>
                                    <span className="animate-spin">/</span>
                                </div>
                            )}

                            {answer && (
                                <div className="space-y-1 animate-fade-in">
                                    <span className="text-[#A7FFEB] font-bold block mb-1">AI_RESPONSE &gt;&gt;</span>
                                    <p className="text-[#E0F2F1] leading-relaxed whitespace-pre-wrap">{answer}</p>
                                </div>
                            )}

                            {results.length > 0 && (
                                <div className="space-y-3 animate-fade-in">
                                    <span className="text-[#FFD740] font-bold block">SEMANTIC_MATCHES &gt;&gt;</span>
                                    {results.map((r, i) => (
                                        <div key={i} className="bg-[#37474F] p-2 rounded border-l-2 border-[#FFD740]">
                                            <p className="text-gray-300 text-xs mb-1">Match Score: {r.score?.toFixed(2)}</p>
                                            <p className="text-white">{r.text}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="space-y-3 shrink-0">
                            <input
                                className="w-full bg-[#1f292e] border-2 border-gray-600 rounded-lg p-3 text-[#E0F2F1] placeholder-gray-500 font-mono focus:outline-none focus:border-[#4DD0E1] focus:ring-1 focus:ring-[#4DD0E1] transition-all"
                                placeholder="Display info on..."
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAnswer()}
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={handleAnswer}
                                    disabled={answerLoading || !question}
                                    className="flex-1 bg-[#4DD0E1] hover:bg-[#26C6DA] disabled:opacity-50 disabled:cursor-not-allowed text-[#006064] font-pixeboy text-xl py-2 rounded-lg border-b-4 border-[#00838F] active:border-b-0 active:translate-y-1 transition-all flex justify-center items-center gap-2"
                                >
                                    <Brain className="w-5 h-5" />
                                    ASK AI
                                </button>
                                <button
                                    onClick={handleQuery}
                                    disabled={answerLoading || !question}
                                    className="flex-1 bg-[#FFD54F] hover:bg-[#FBC02D] disabled:opacity-50 disabled:cursor-not-allowed text-[#F57F17] font-pixeboy text-xl py-2 rounded-lg border-b-4 border-[#F9A825] active:border-b-0 active:translate-y-1 transition-all flex justify-center items-center gap-2"
                                >
                                    <Search className="w-5 h-5" />
                                    FIND CONTEXT
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Notebook (Tabs) */}
                <div className="lg:col-span-6 h-full flex flex-col bg-white border-4 border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b-4 border-black bg-[#EEEEEE] shrink-0">
                        <button
                            onClick={() => setActiveTab("summary")}
                            className={`flex-1 py-4 font-pixeboy text-2xl flex items-center justify-center gap-2 transition-all
                                ${activeTab === "summary"
                                    ? "bg-[#FFF9C4] text-black shadow-[inset_0_-4px_#FBC02D]"
                                    : "bg-[#EEEEEE] text-gray-400 hover:bg-gray-200"
                                }
                            `}
                        >
                            <Brain className="w-6 h-6" />
                            SMART NOTES
                        </button>
                        <div className="w-1 bg-black"></div>
                        <button
                            onClick={() => setActiveTab("transcript")}
                            className={`flex-1 py-4 font-pixeboy text-2xl flex items-center justify-center gap-2 transition-all
                                ${activeTab === "transcript"
                                    ? "bg-[#E1F5FE] text-black shadow-[inset_0_-4px_#039BE5]"
                                    : "bg-[#EEEEEE] text-gray-400 hover:bg-gray-200"
                                }
                            `}
                        >
                            <FileText className="w-6 h-6" />
                            TRANSCRIPT
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 bg-[url('/notebook-paper.png')] bg-repeat relative custom-scrollbar">
                        {/* Lined Paper Effect (CSS fallback if image missing) */}
                        <div className="absolute inset-0 pointer-events-none opacity-10"
                            style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px)', backgroundSize: '100% 2rem' }}>
                        </div>

                        {activeTab === "summary" ? (
                            <div className="space-y-6">
                                {summarizing ? (
                                    <div className="flex flex-col items-center justify-center py-10 opacity-70">
                                        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mb-4"></div>
                                        <p className="font-pixeboy text-xl">Analyzing Lecture...</p>
                                    </div>
                                ) : summaries.length > 0 ? (
                                    summaries.map((s, index) => (
                                        <div key={index} className="relative group">
                                            <div className="absolute -left-3 top-0 bottom-0 w-1 bg-[#FBC02D] rounded-full"></div>
                                            <div className="pl-4">
                                                {/* <span className="inline-block bg-[#263238] text-[#FFF9C4] text-xs font-mono px-2 py-0.5 rounded mb-1">
                                                    {formatTime(s.timestamp || 0)}
                                                </span> */}
                                                <p className="font-sans text-lg leading-relaxed text-gray-800 whitespace-pre-wrap">
                                                    {s.output}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-gray-400 font-pixeboy text-2xl">
                                        No notes available yet.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {transcript.map((chunk, index) => (
                                    <div key={index} className="hover:bg-[#E1F5FE] p-2 rounded transition-colors group cursor-pointer">
                                        <div className="flex gap-3">
                                            {/* <span className="text-xs font-mono text-gray-400 group-hover:text-[#0277BD] pt-1 w-12 shrink-0">
                                                {formatTime(chunk.start)}
                                            </span> */}
                                            <p className="text-gray-700 font-mono text-sm leading-relaxed">
                                                {chunk.text}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #fcfcfc;
                    border-left: 2px solid #e0e0e0;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #B0BEC5;
                    border-radius: 5px;
                    border: 2px solid #fcfcfc;
                }
                
                .custom-scrollbar-dark::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar-dark::-webkit-scrollbar-track {
                    background: #263238;
                }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb {
                    background: #455A64;
                    border-radius: 4px;
                }

                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
}

function formatTime(seconds: any): string {
    const numConfig = Number(seconds);
    if (isNaN(numConfig)) return "0:00";
    const mins = Math.floor(numConfig / 60);
    const secs = Math.floor(numConfig % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

