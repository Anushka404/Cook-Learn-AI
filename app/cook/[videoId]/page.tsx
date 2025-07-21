"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
    ShoppingBasket,
    UtensilsCrossed,
    ChefHat
} from "lucide-react";
import TruckLoader from "@/components/TruckLoader";

export default function CookPage() {
    const { videoId } = useParams<{ videoId: string }>();
    const [loading, setLoading] = useState(true);
    const [ingredients, setIngredients] = useState<string[]>([]);
    const [steps, setSteps] = useState<{ step: string; timestamp: number }[]>([]);
    const [error, setError] = useState("");
    const [title, setTitle] = useState("");
    const [summary, setSummary] = useState("");
    const router = useRouter();
    const ranRef = useRef(false); // Prevent double execution

    useEffect(() => {
        if (ranRef.current) return;
        ranRef.current = true;

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

                await new Promise((res) => setTimeout(res, 2000));

                const res = await fetch(`/api/summarize-cook`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ videoId }),
                });

                const retryCount = Number(sessionStorage.getItem("retryCount") || "0");

                if (res.status === 404) {
                    if (retryCount < 4) {
                        sessionStorage.setItem("retryCount", String(retryCount + 1));
                        setError("🍳 Cooking magic is still loading… Retrying shortly!");
                        await new Promise((r) => setTimeout(r, 1500));
                        location.reload();
                        return;
                    } else {
                        setError("🥲 Still cooking… Please try again in a moment.");
                        return;
                    }
                }

                if (!res.ok) {
                    const errorData = await res.json();
                    setError(errorData.error || "Failed to fetch recipe");
                    return;
                }

                const data = await res.json();
                setTitle(data?.title || "");
                setSummary(data?.summary || "");
                setIngredients(data?.ingredients || []);
                setSteps(data?.steps || []);
                sessionStorage.removeItem("retryCount");
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

    if (loading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center text-center space-y-4 bg-amber-100">
                <Image
                    src="/food.avif"
                    alt="Food background"
                    fill
                    className="object-cover opacity-20 z-0 blur-[3px]"
                    priority
                />
                    <TruckLoader />
                    <div className="text-xl font-semibold text-gray-700 animate-pulse">
                        Loading recipe...
                </div>
            </div>
        );
    }

    if (error === "🍳 Cooking magic is still loading… Retrying shortly!") {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center text-center space-y-2 animate-pulse bg-amber-100">
                    <Image
                        src="/food.avif"
                        alt="Food background"
                        fill
                        className="object-cover opacity-20 z-0 blur-[3px]"
                        priority
                    />
                    <TruckLoader />
                    <div className="text-2xl text-white">🍳 Cooking magic is still loading…</div>
                    <div className="text-gray-300">Just a moment...</div>
            </div>
        );
    }
    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center text-red-600 text-center">
                {error}
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-[#D7B6FF] px-4 py-10 font-sans">
            {/* Floating Emojis */}
            <>
                <span className="absolute top-10 left-8 text-[88px] opacity-30 rotate-[10deg] select-none">🍝</span>
                <span className="absolute bottom-24 left-12 text-[64px] opacity-30 rotate-[-15deg] select-none">🧄</span>
                <span className="absolute top-20 right-16 text-[100px] opacity-30 rotate-[-8deg] select-none">🥕</span>
                <span className="absolute bottom-12 right-8 text-[52px] opacity-35 rotate-[12deg] select-none">🧂</span>
                <span className="absolute top-1/2 -translate-y-1/2 -left-1 text-[90px] opacity-30 rotate-[15deg] select-none">🥬</span>
                <span className="absolute top-[28%] right-[38%] text-[72px] opacity-30 rotate-[-5deg] blur-xs select-none">🍳</span>
                <span className="absolute top-1/2 -translate-y-1/2 -right-1 text-[85px] opacity-30 rotate-[-12deg] select-none">🧈</span>
                <span className="absolute top-6 right-4 text-[56px] opacity-30 rotate-[14deg] select-none">🍅</span>
                <span className="absolute top-52 left-32 text-[48px] opacity-30 rotate-[10deg] select-none">🧀</span>
                <span className="absolute top-[70%] left-6 text-[60px] opacity-30 rotate-[-10deg] select-none">🫑</span>
            </>

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
                    <h1 className="text-3xl font-mono font-extrabold text-[#1F1F1F]">{title}</h1>
                    <p className="text-gray-700 text-lg italic mt-2">{summary}</p>
                </div>

                {/* Ingredients */}
                <div>
                    <h2 className="text-2xl font-mono font-semibold mb-2 text-[#1F1F1F] flex items-center gap-2">
                        <ShoppingBasket className="w-6 h-6 text-amber-600" />
                        Ingredients</h2>
                    <div className="flex flex-wrap gap-2">
                        {Array.isArray(ingredients) &&
                            ingredients.map((ing, i) => (
                                <span
                                    key={i}
                                    className="bg-[#B8F2E6] text-[#1F1F1F] font-montserrat px-3 py-1 rounded-full border border-black text-sm flex items-center gap-1"
                                >
                                    <UtensilsCrossed className="w-4 h-4 text-[#1F1F1F]" />
                                    {ing}
                                </span>
                            ))}
                    </div>
                </div>

                {/* Steps */}
                <div>
                    <h2 className="text-2xl font-semibold font-mono mb-3 text-[#1F1F1F] flex items-center gap-2">
                        <ChefHat className="w-6 h-6 text-amber-600" />
                        Steps</h2>
                    <ol className="list-decimal pl-6 space-y-2 text-gray-800">
                        {Array.isArray(steps) &&
                            steps.map((stepObj, i) => (
                                <li key={i} className="bg-[#FDFDFD] p-3 font-montserrat rounded border border-gray-200 shadow-sm">
                                    {stepObj.step}
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