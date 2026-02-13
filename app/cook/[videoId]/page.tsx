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
            // Check cache first
            const cached = localStorage.getItem(`cook-full-${videoId}`);
            if (cached) {
                try {
                    const data = JSON.parse(cached);
                    if (data && data.steps) {
                        setTitle(data.title || "");
                        setSummary(data.summary || "");
                        setIngredients(data.ingredients || []);
                        setSteps(data.steps || []);
                        setLoading(false);
                        return; // Skip fetch
                    }
                } catch (e) {
                    console.error("Cache parse error", e);
                    localStorage.removeItem(`cook-full-${videoId}`);
                }
            }

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

                // Cache the full result
                localStorage.setItem(`cook-full-${videoId}`, JSON.stringify(data));

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
            <div className="fixed inset-0 z-0">
                            <Image
                                src="/food-bg1.jpg"
                                alt="Food Background"
                                fill
                                className="object-contain opacity-10 blur-[1.7px]"
                                priority
                            />
                        </div>

            <div className="mx-auto w-full max-w-6xl space-y-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Video & Main Info */}
                    <div className="lg:col-span-7 flex flex-col gap-6">
                        {/* Video Container */}
                        <div className="w-full bg-white border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                            <div className="aspect-video w-full border-b-4 border-black">
                                <iframe
                                    src={`https://www.youtube.com/embed/${videoId}`}
                                    className="w-full h-full"
                                    allowFullScreen
                                />
                            </div>
                            <div className="p-6 bg-white">
                                <h1 className="text-3xl sm:text-4xl font-mono font-black text-black leading-tight uppercase tracking-tight">
                                    {title}
                                </h1>
                            </div>
                        </div>

                        {/* Summary Card */}
                        <div className="bg-[#FFEB99] border-4 border-black rounded-xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform hover:-translate-y-1 transition-transform">
                            <p className="text-black text-lg font-medium font-mono leading-relaxed">
                                "{summary}"
                            </p>
                        </div>

                        {/* Desktop CTA */}
                        <div className="hidden lg:block">
                            <button
                                onClick={handleCook}
                                className="w-full bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-black font-mono text-xl py-6 px-8 border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-0 active:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 flex items-center justify-center gap-3"
                            >
                                <ChefHat className="w-8 h-8" strokeWidth={3} />
                                START COOKING MODE
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Ingredients & Steps Preview */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Ingredients */}
                        <div className="bg-white border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
                            <h2 className="text-2xl font-black font-mono mb-4 text-black flex items-center gap-3 uppercase border-b-4 border-black pb-2">
                                <ShoppingBasket className="w-8 h-8" strokeWidth={2.5} />
                                Ingredients
                            </h2>
                            <div className="flex flex-wrap gap-3">
                                {Array.isArray(ingredients) &&
                                    ingredients.map((ing, i) => (
                                        <span
                                            key={i}
                                            className="bg-[#A0E7E5] text-black font-bold font-mono px-4 py-2 rounded-lg border-2 border-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all cursor-default"
                                        >
                                            {ing}
                                        </span>
                                    ))}
                            </div>
                        </div>

                        {/* Steps Preview */}
                        <div className="bg-white border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
                            <h2 className="text-2xl font-black font-mono mb-4 text-black flex items-center gap-3 uppercase border-b-4 border-black pb-2">
                                <UtensilsCrossed className="w-8 h-8" strokeWidth={2.5} />
                                Steps
                            </h2>
                            <div className="max-h-[400px] overflow-y-auto pr-2">
                                <ol className="space-y-3">
                                    {Array.isArray(steps) &&
                                        steps.map((stepObj, i) => (
                                            <li key={i} className="flex gap-3 items-start font-medium text-black group">
                                                <span className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-md flex items-center justify-center font-mono font-bold border-2 border-black group-hover:bg-[#FFD761] group-hover:text-black transition-colors">
                                                    {i + 1}
                                                </span>
                                                <p className="font-sans text-sm sm:text-base leading-snug pt-1">
                                                    {stepObj.step}
                                                </p>
                                            </li>
                                        ))}
                                </ol>
                            </div>
                        </div>

                        {/* Mobile CTA */}
                        <div className="block lg:hidden pt-2">
                            <button
                                onClick={handleCook}
                                className="w-full bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-black font-mono text-lg py-5 px-6 border-4 border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2"
                            >
                                START COOKING
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}