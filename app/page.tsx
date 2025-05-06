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




  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const videoId = extractVideoId(input);
    if (!videoId) {
      alert("Invalid YouTube URL");
      return;
    }
    router.push(`/${videoId}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-black">
      <h1 className="text-3xl font-bold mb-6">🎥 AI-Powered Video Summarizer</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste YouTube video URL here..."
          className="w-full p-3 border rounded mb-4"
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition"
        >
          Analyze Video
        </button>
      </form>
    </div>
  );
}
