"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
    } catch (e) {
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
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-black">
      <h1 className="text-3xl font-bold mb-6">🎥 AI-Powered Video Assistant</h1>
      <div className="w-full max-w-md">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter YouTube URL..."
          className="w-full p-3 border border-gray-300 rounded mb-4 bg-white text-black"
        />
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => handleSubmit("summarize")}
            className="w-full bg-purple-700 hover:bg-purple-500 text-white p-3 rounded"
          >
            📘 Summarize Lecture
          </button>

          <button
            onClick={() => handleSubmit("cook")}
            className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded"
          >
            🍳 Let’s Cook!
          </button>
        </div>
      </div>
    </div>
  );
}
