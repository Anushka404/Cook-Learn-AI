"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function CookPage() {
    const { videoId } = useParams<{ videoId: string }>();
    const [loading, setLoading] = useState(true);
    const [ingredients, setIngredients] = useState<string[]>([]);
    const [steps, setSteps] = useState<string[]>([]);
    const [error, setError] = useState("");
    const [title, setTitle] = useState("");
    const [summary, setSummary] = useState("");
    const router = useRouter();

    useEffect(() => {
        async function fetchRecipe() {
            try {
                const transcriptRes = await fetch("/api/transcript", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ videoId }),
                });
                const { transcript } = await transcriptRes.json();
                if (!transcript) throw new Error("Transcript not found");

                await fetch("/api/embed", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ transcript, videoId, mode: "cook" }),
                });

                const res = await fetch(`/api/summarize-cook`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ videoId }),
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    setError(errorData.error || "Failed to fetch recipe");
                    setLoading(false);
                    return;
                }

                const data = await res.json();
                setTitle(data?.title || "");
                setSummary(data?.summary || "");
                setIngredients(data?.ingredients || []);
                setSteps(data?.steps || []);

            } catch (error) {
                console.error("Error fetching recipe:", error);
                setError("Something went wrong while loading the recipe.");
            } finally {
                setLoading(false);
            }
        }
        fetchRecipe();
    }, [videoId]);

    const handleCook = () => {
        if (steps.length > 0) {
            localStorage.setItem(`cook-steps-${videoId}`, JSON.stringify(steps));
        }
        router.push(`/cook/${videoId}/start`);
    };

    if (loading)
        return <div className="p-4 text-xl text-center">Loading recipe...</div>;
    if (error)
        return <div className="p-4 text-red-600 text-center">{error}</div>;

    return (
        <div className="relative min-h-screen bg-[#D7B6FF] px-4 py-10 font-sans">
            {/* Squiggle Line Art */}
            <div className="absolute top-20 right-10 w-[500px] opacity-30 -z-10 rotate-[-6deg]">
                <svg viewBox="0 0 500 150" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M0,100 C100,0 400,200 500,100"
                        fill="transparent"
                        stroke="#713C33"
                        strokeWidth="6"
                        strokeDasharray="12 10"
                    />
                </svg>
            </div>

            <div className="mx-auto w-full max-w-5xl bg-white border-4 border-black rounded-xl shadow-lg p-6 sm:p-10 space-y-6">
                {/* YouTube Video */}
                <div className="w-full aspect-video rounded-md overflow-hidden border border-black">
                    <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        className="w-full h-full"
                        allowFullScreen
                    />
                </div>

                {/* Title and Summary */}
                <div>
                    <h1 className="text-3xl font-extrabold text-[#1F1F1F]">{title}</h1>
                    <p className="text-gray-700 text-lg italic mt-2">{summary}</p>
                </div>

                {/* Ingredients */}
                <div>
                    <h2 className="text-2xl font-semibold mb-2 text-[#1F1F1F]">🛒 Ingredients</h2>
                    <div className="flex flex-wrap gap-2">
                        {Array.isArray(ingredients) &&
                            ingredients.map((ing, i) => (
                                <span
                                    key={i}
                                    className="bg-[#B8F2E6] text-[#1F1F1F] px-3 py-1 rounded-full border border-black text-sm"
                                >
                                    🧂 {ing}
                                </span>
                            ))}
                    </div>
                </div>

                {/* Steps */}
                <div>
                    <h2 className="text-2xl font-semibold mb-3 text-[#1F1F1F]">📋 Steps</h2>
                    <ol className="list-decimal pl-6 space-y-2 text-gray-800">
                        {Array.isArray(steps) &&
                            steps.map((step, i) => (
                                <li key={i} className="bg-[#FDFDFD] p-3 rounded border border-gray-200 shadow-sm">
                                    {step}
                                </li>
                            ))}
                    </ol>
                </div>

                {/* CTA Button */}
                <div className="text-center">
                    <button
                        onClick={handleCook}
                        className="bg-[#FFD761] hover:bg-yellow-400 text-black font-semibold px-6 py-3 rounded-full shadow-lg transition"
                    >
                        🍳 Let’s Start Cooking
                    </button>
                </div>
            </div>
        </div>
    );
}