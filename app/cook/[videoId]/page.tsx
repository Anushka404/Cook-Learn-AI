"use client"
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function CookPage() {
    const { videoId } = useParams<{ videoId: string }>();
    const [loading, setLoading] = useState(true);
    const [ingredients, setIngredients] = useState<string[]>([]);
    const [steps, setSteps] = useState<string[]>([]);
    const [error, setError] = useState("");
    const [title, setTitle] = useState("");
    const [summary, setSummary] = useState("");

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
                    body: JSON.stringify({
                        transcript,
                        videoId: `cook-${videoId}`,
                    }),
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
                setLoading(false);
            } catch (error) {
                console.error("Error fetching recipe:", error);
                setLoading(false);
            } finally {
                setLoading(false);
            }
        }
        fetchRecipe();
    }, [videoId]);
    if (loading) return <div className="p-4 text-xl">Loading recipe...</div>;
    if (error) return <div className="p-4 text-red-600">{error}</div>;

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold text-amber-700">{title}</h1>
            <p className="text-lg text-gray-600 italic">{summary}</p>

            <h2 className="text-2xl font-semibold mt-6">🛒 Ingredients</h2>
            <ul className="list-disc pl-6 space-y-1">
                {ingredients.map((ing, i) => (
                    <li key={i}>🧂 {ing}</li> 
                ))}
            </ul>

            <button className="mt-6 bg-amber-600 text-white px-4 py-2 rounded shadow">
                Let the Cooking Begin
            </button>
        </div>
    );

}