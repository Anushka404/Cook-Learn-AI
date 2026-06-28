"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChefHat, ArrowLeft } from "lucide-react";
import TruckLoader from "@/components/TruckLoader";

type SavedRecipe = {
    video_id: string;
    title: string | null;
    thumbnail: string | null;
    created_at: string;
};

export default function CookbookPage() {
    const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/recipes")
            .then((r) => r.json())
            .then((d) => setRecipes(d.recipes ?? []))
            .catch(() => setRecipes([]))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-amber-100">
                <TruckLoader />
                <div className="font-pixeboy text-3xl tracking-wider text-gray-700 animate-pulse mt-4">
                    Loading cookbook...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-amber-100 px-4 py-8 sm:py-12 font-sans text-black">
            <div className="mx-auto w-full max-w-6xl space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-5xl sm:text-6xl font-pixeboy uppercase tracking-wide">
                        My Cookbook
                    </h1>
                    <Link
                        href="/"
                        className="bg-white border-2 border-black px-4 py-2 rounded-lg font-mono font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4" /> Home
                    </Link>
                </div>

                {recipes.length === 0 ? (
                    <div className="bg-white border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-10 text-center space-y-4">
                        <ChefHat className="w-16 h-16 mx-auto" strokeWidth={2} />
                        <p className="font-mono font-bold text-lg">No saved recipes yet.</p>
                        <Link
                            href="/"
                            className="inline-block bg-[#FF6B6B] text-white font-pixeboy text-2xl py-3 px-6 border-4 border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all"
                        >
                            Cook something
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recipes.map((r) => (
                            <Link
                                key={r.video_id}
                                href={`/cook/${r.video_id}`}
                                className="group bg-white border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all overflow-hidden flex flex-col"
                            >
                                <div className="aspect-video w-full border-b-4 border-black bg-black overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={r.thumbnail || `https://img.youtube.com/vi/${r.video_id}/hqdefault.jpg`}
                                        alt={r.title || "Recipe"}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                </div>
                                <div className="p-4 flex items-center gap-3">
                                    <div className="w-10 h-10 shrink-0 bg-[#FF6B6B] border-2 border-black rounded-lg flex items-center justify-center">
                                        <ChefHat className="w-6 h-6 text-white" strokeWidth={2.5} />
                                    </div>
                                    <h2 className="font-pixeboy text-2xl uppercase leading-tight line-clamp-2">
                                        {r.title || "Untitled recipe"}
                                    </h2>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
