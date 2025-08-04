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
                className="object-cover opacity-40 blur-[2px] z-0"
                priority
            />
            <div className="z-10 text-center mb-8">
                <h1 className="text-4xl sm:text-5xl font-extrabold mb-3">
                    Cook-Mate AI
                </h1>
                <p className="text-lg text-gray-900 font-medium ">
                    Your smart assistant for cooking and learning with YouTube videos.
                </p>
            </div>

            <div className="bg-gray-100 border-4 border-black shadow-lg rounded-lg p-6 w-full max-w-xl z-10">
                <div className="flex items-center gap-3 mb-4">
                    <Clapperboard className="text-red-600 w-6 h-6" />
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Paste a YouTube URL here..."
                        className="flex-1 p-3 border-3 border-gray-600 rounded-md text-black focus:outline-none focus:border-blue-500"
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                    {/* <button
                        onClick={() => handleSubmit("summarize")}
                        className="w-full flex items-center justify-center gap-2 bg-[#FFD761] hover:bg-yellow-400 text-black font-medium p-3 rounded shadow-md"
                    >
                        <BookOpenCheck className="w-5 h-5" />
                        Summarize Lecture
                    </button> */}

                    <button
                        onClick={() => handleSubmit("cook")}
                        className="w-full flex items-center justify-center gap-2 border-2 border-black text-black font-medium p-3 rounded bg-[#FFD761] hover:bg-yellow-400"
                    >
                        <ChefHat className="w-5 h-5" />
                        Let’s Cook!
                    </button>
                </div>
            </div>
        </div>
    );
}
