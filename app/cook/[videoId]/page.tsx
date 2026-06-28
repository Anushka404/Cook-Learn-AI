"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
    ShoppingBasket,
    UtensilsCrossed,
    ChefHat,
    Bookmark
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
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
    const router = useRouter();
    const ranRef = useRef(false); // Prevent double execution
    const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (ranRef.current) return;
        ranRef.current = true;

        async function fetchRecipe() {
            // 1. Local cache (fastest, same-device)
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
                        // Confirm saved-state + restore checked ingredients in the background
                        // (DB is the cross-device source of truth).
                        fetch(`/api/recipes/${videoId}`).then(async (r) => {
                            setSaved(r.ok);
                            if (r.ok) {
                                const row = await r.json();
                                if (Array.isArray(row.checked_ingredients)) {
                                    setCheckedIngredients(new Set(row.checked_ingredients));
                                }
                            }
                        }).catch(() => { });
                        return; // Skip fetch
                    }
                } catch (e) {
                    console.error("Cache parse error", e);
                    localStorage.removeItem(`cook-full-${videoId}`);
                }
            }

            // 2. Saved recipe in DB (cross-device, zero pipeline cost)
            try {
                const dbRes = await fetch(`/api/recipes/${videoId}`);
                if (dbRes.ok) {
                    const row = await dbRes.json();
                    const data = { title: row.title, ...row.recipe };
                    setTitle(row.title || "");
                    setSummary(row.recipe?.summary || "");
                    setIngredients(row.recipe?.ingredients || []);
                    setSteps(row.recipe?.steps || []);
                    setSaved(true);
                    setCheckedIngredients(new Set(row.checked_ingredients || []));
                    localStorage.setItem(`cook-full-${videoId}`, JSON.stringify(data));
                    setLoading(false);
                    return;
                }
            } catch (e) {
                console.error("DB recipe lookup failed", e);
            }

            // 3. Full pipeline (transcript -> embed -> summarize)
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

    const handleSave = async () => {
        if (saving) return;
        setSaving(true);
        try {
            if (saved) {
                const res = await fetch(`/api/recipes/${videoId}`, { method: "DELETE" });
                if (res.ok) setSaved(false);
            } else {
                const res = await fetch("/api/recipes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        videoId,
                        title,
                        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                        recipe: { summary, ingredients, steps },
                        checkedIngredients: Array.from(checkedIngredients),
                    }),
                });
                if (res.ok) setSaved(true);
            }
        } catch (e) {
            console.error("Save toggle failed", e);
        } finally {
            setSaving(false);
        }
    };

    const persistChecked = (next: Set<number>) => {
        if (!saved) return; // only saved recipes persist to DB
        if (persistTimer.current) clearTimeout(persistTimer.current);
        persistTimer.current = setTimeout(() => {
            fetch(`/api/recipes/${videoId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ checkedIngredients: Array.from(next) }),
            }).catch((e) => console.error("Persist checked failed", e));
        }, 600);
    };

    const toggleIngredient = (index: number) => {
        const next = new Set(checkedIngredients);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        setCheckedIngredients(next);
        persistChecked(next);
    };

    const allChecked = ingredients.length > 0 && checkedIngredients.size === ingredients.length;

    const toggleAll = () => {
        const next = allChecked ? new Set<number>() : new Set(ingredients.map((_, i) => i));
        setCheckedIngredients(next);
        persistChecked(next);
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
                <div className="text-xl font-semibold text-gray-700 animate-pulse font-pixeboy tracking-wider text-3xl">
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
                <div className="text-4xl text-black font-pixeboy">🍳 Cooking magic is still loading…</div>
                <div className="text-gray-600 font-medium">Just a moment...</div>
            </div>
        );
    }
    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center text-red-600 text-center bg-[#D7B6FF] font-pixeboy text-3xl">
                {error}
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-[#D7B6FF] px-4 py-8 sm:py-10 font-sans selection:bg-[#FFD761] selection:text-black">
            {/* Floating Background Texture */}
            <div className="fixed inset-0 z-0 opacity-10 pointer-events-none">
                <Image
                    src="/food-bg1.jpg"
                    alt="Food Background"
                    fill
                    className="object-cover"
                    priority
                />
            </div>

            <div className="mx-auto w-full max-w-7xl space-y-8 relative z-10">
                {/* Header Section (Mobile Only) */}
                <div className="lg:hidden bg-white border-4 border-black p-4 rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-6 flex items-center gap-3">
                    <h1 className="flex-1 text-3xl font-pixeboy text-black leading-tight uppercase tracking-wide text-center">
                        {title}
                    </h1>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        aria-label={saved ? "Remove from cookbook" : "Save to cookbook"}
                        className={`shrink-0 w-12 h-12 border-2 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center disabled:opacity-60 ${saved ? "bg-[#FFD761]" : "bg-white"}`}
                    >
                        <Bookmark className="w-6 h-6 text-black" strokeWidth={2.5} fill={saved ? "currentColor" : "none"} />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Sticky Sidebar (Video & CTA) */}
                    <div className="lg:col-span-7 lg:sticky lg:top-8 flex flex-col gap-6">
                        {/* Video Container */}
                        <div className="group relative w-full bg-black border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                            <div className="aspect-video w-full">
                                <iframe
                                    src={`https://www.youtube.com/embed/${videoId}`}
                                    className="w-full h-full"
                                    allowFullScreen
                                />
                            </div>
                            {/* Decorative 'TV' elements */}
                            <div className="absolute top-4 right-4 flex gap-2 pointer-events-none">
                                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                                <div className="w-16 h-1 bg-white/20 rounded-full backdrop-blur-sm" />
                            </div>
                        </div>

                        {/* Title & Summary (Desktop) */}
                        <div className="hidden lg:block space-y-4">
                            <h1 className="text-5xl font-pixeboy text-black uppercase tracking-wide text-shadow-sm leading-none">
                                {title}
                            </h1>
                            <div className="bg-[#FFEB99] border-4 border-black rounded-xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <p className="text-black text-lg font-medium font-mono leading-relaxed opacity-90">
                                    &quot;{summary}&quot;
                                </p>
                            </div>
                        </div>

                        {/* Summary (Mobile) */}
                        <div className="lg:hidden bg-[#FFEB99] border-4 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <p className="text-black text-base font-medium font-mono leading-relaxed">
                                &quot;{summary}&quot;
                            </p>
                        </div>

                        {/* Desktop CTA */}
                        <div className="hidden lg:block mt-2">
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCook}
                                    className="group flex-1 relative bg-[#FF6B6B] hover:bg-[#ff5252] text-white overflow-hidden font-pixeboy text-3xl py-5 px-8 border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-0 active:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 flex items-center justify-center gap-3"
                                >
                                    <span className="relative z-10 flex items-center gap-3">
                                        <ChefHat className="w-10 h-10 animate-bounce" strokeWidth={2.5} />
                                        START COOKING MODE
                                    </span>
                                    {/* Button Shine Effect */}
                                    <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    aria-label={saved ? "Remove from cookbook" : "Save to cookbook"}
                                    title={saved ? "Saved to cookbook" : "Save to cookbook"}
                                    className={`shrink-0 w-20 border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-0 active:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed ${saved ? "bg-[#FFD761]" : "bg-white hover:bg-[#FFF4D6]"}`}
                                >
                                    <Bookmark className="w-9 h-9 text-black" strokeWidth={2.5} fill={saved ? "currentColor" : "none"} />
                                </button>
                            </div>
                            <p className="text-center mt-3 font-pixeboy text-lg opacity-60">
                                Voice-activated hands-free guide
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Ingredients & Steps */}
                    <div className="lg:col-span-5 space-y-8 pb-24 lg:pb-0">
                        {/* Ingredients Card */}
                        <div className="bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                            <div className="bg-[#A0E7E5] border-b-4 border-black p-4 flex items-center justify-between gap-3">
                                <h2 className="text-3xl font-pixeboy text-black flex items-center gap-3 uppercase">
                                    <ShoppingBasket className="w-8 h-8" strokeWidth={2.5} />
                                    Ingredients <span className="text-sm bg-black text-white px-2 py-0.5 rounded-full font-sans">{ingredients.length}</span>
                                </h2>
                                {ingredients.length > 0 && (
                                    <button
                                        onClick={toggleAll}
                                        className="shrink-0 whitespace-nowrap bg-white border-2 border-black rounded-lg px-3 py-1.5 font-sans font-bold text-sm text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all"
                                    >
                                        {allChecked ? "Deselect All" : "Select All"}
                                    </button>
                                )}
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 gap-3">
                                    {Array.isArray(ingredients) &&
                                        ingredients.map((ing, i) => {
                                            const isChecked = checkedIngredients.has(i);
                                            return (
                                                <div
                                                    key={i}
                                                    onClick={() => toggleIngredient(i)}
                                                    className={`
                                                        cursor-pointer select-none transition-all duration-200
                                                        flex items-center gap-3 p-3 rounded-xl border-2
                                                        ${isChecked
                                                            ? "bg-gray-100 border-gray-300 opacity-60 grayscale"
                                                            : "bg-white border-black hover:bg-[#FFF4D6] hover:scale-[1.01] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                                        }
                                                    `}
                                                >
                                                    <div className={`
                                                        w-6 h-6 rounded border-2 border-black flex items-center justify-center transition-colors
                                                        ${isChecked ? "bg-black" : "bg-white"}
                                                    `}>
                                                        {isChecked && <div className="w-4 bg-white h-0.5 rotate-45" />} {/* Simple checkmark approximation or blank */}
                                                        {isChecked && <div className="w-4 bg-white h-0.5 -rotate-45 absolute" />}
                                                    </div>
                                                    <span className={`font-mono font-bold text-sm sm:text-base ${isChecked ? "line-through text-gray-500" : "text-black"}`}>
                                                        {ing}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>

                        {/* Steps Preview Card */}
                        <div className="bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                            <div className="bg-[#FFD761] border-b-4 border-black p-4">
                                <h2 className="text-3xl font-pixeboy text-black flex items-center gap-3 uppercase">
                                    <UtensilsCrossed className="w-8 h-8" strokeWidth={2.5} />
                                    Instructions
                                </h2>
                            </div>
                            <div className="p-0">
                                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-6 space-y-6">
                                    {Array.isArray(steps) &&
                                        steps.map((stepObj, i) => (
                                            <div key={i} className="flex gap-4 items-start group">
                                                <div className="flex-shrink-0 w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center font-pixeboy text-2xl border-2 border-black group-hover:bg-[#FF6B6B] group-hover:scale-110 transition-all duration-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]">
                                                    {i + 1}
                                                </div>
                                                <div className="pt-1">
                                                    <p className="font-sans text-base sm:text-lg leading-relaxed text-black font-medium border-l-4 border-transparent pl-3 group-hover:border-[#FF6B6B] transition-all">
                                                        {stepObj.step}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Mobile CTA */}
            <div className="fixed bottom-0 left-0 right-0 p-4 lg:hidden z-50 bg-gradient-to-t from-[#D7B6FF] to-transparent pb-6 pt-10 pointer-events-none">
                <button
                    onClick={handleCook}
                    className="pointer-events-auto w-full bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-pixeboy text-2xl py-4 px-6 border-4 border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-3 animate-fade-in-up"
                >
                    <ChefHat className="w-8 h-8" strokeWidth={2.5} />
                    START COOKING
                </button>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 12px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-left: 2px solid black;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #000;
                    border: 2px solid #fff;
                    border-radius: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #333;
                }
                @keyframes shimmer {
                    100% {
                        transform: translateX(100%);
                    }
                }
            `}</style>
        </div>
    );
}