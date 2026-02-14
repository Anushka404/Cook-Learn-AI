"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Clapperboard, ChefHat, BookOpenCheck } from "lucide-react";

export default function Home() {
    const router = useRouter();
    const [input, setInput] = useState("");

    const extractVideoId = (url: string): string | null => {
        try {
            const parsed = new URL(url);
            if (parsed.hostname.includes("youtu.be")) {
                return parsed.pathname.slice(1);
            } else if (parsed.hostname.includes("youtube.com")) {
                return parsed.searchParams.get("v");
            }
        } catch {
            return null;
        }
        return null;
    };

    const handleSubmit = (type: "summarize" | "cook") => {
        const videoId = extractVideoId(input);
        if (!videoId) {
            alert("Invalid YouTube URL");
            return;
        }

        const path = type === "cook" ? `cook/${videoId}` : `${videoId}`;
        router.push(path);
    };

    return (
        <div className="min-h-screen bg-amber-100 flex flex-col items-center justify-center p-6 font-sans text-black overflow-hidden">
            <Image
                src="/food.avif"
                alt="Food background"
                fill
                className="object-cover opacity-20 z-0"
                priority
            />
            {/* Main Card Container */}
            <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-xl p-8 w-full max-w-4xl z-10 relative">
                {/* Decorative Elements */}
                <div className="absolute -top-6 -left-6 bg-[#FF6B6B] w-16 h-16 border-4 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-20 hidden sm:flex">
                    <ChefHat className="text-white w-8 h-8" />
                </div>
                <div className="absolute -bottom-6 -right-6 bg-[#A0E7E5] w-16 h-16 border-4 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-20 hidden sm:flex">
                    <BookOpenCheck className="text-black w-8 h-8" />
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-6xl sm:text-7xl font-pixeboy text-black mb-2 tracking-wide uppercase">
                        Cook <span className="text-[#FF6B6B]">&</span> Learn AI
                    </h1>
                    <p className="text-lg sm:text-xl text-gray-800 font-bold font-mono bg-[#FFEB99] inline-block px-4 py-1 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -rotate-1">
                        Your smart assistant for video learning
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Clapperboard className="text-black w-6 h-6" />
                        </div>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Paste a YouTube URL here..."
                            className="w-full pl-12 pr-4 py-4 text-lg font-mono border-4 border-black rounded-lg focus:outline-none focus:ring-4 focus:ring-[#A0E7E5] focus:border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all placeholder-gray-500 text-black"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={() => handleSubmit("summarize")}
                            className="group w-full flex flex-col items-center justify-center gap-2 bg-[#FFD761] hover:bg-[#ffc933] text-black font-black font-mono text-lg py-6 px-4 border-4 border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                        >
                            <BookOpenCheck className="w-8 h-8 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                            <span>SUMMARIZE</span>
                        </button>

                        <button
                            onClick={() => handleSubmit("cook")}
                            className="group w-full flex flex-col items-center justify-center gap-2 bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-black font-mono text-lg py-6 px-4 border-4 border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                        >
                            <ChefHat className="w-8 h-8 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                            <span>COOK MODE</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
