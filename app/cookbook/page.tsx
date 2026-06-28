"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChefHat, Home, BookOpenCheck } from "lucide-react";
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
            <div className="relative flex min-h-screen flex-col items-center justify-center bg-amber-100 overflow-hidden">
                <Image src="/food.avif" alt="Food background" fill className="object-cover opacity-20 z-0" priority />
                <div className="relative z-10 flex flex-col items-center">
                    <TruckLoader />
                    <div className="font-pixeboy text-3xl tracking-wider text-gray-700 animate-pulse mt-4">
                        Loading cookbook...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-amber-100 overflow-hidden font-sans text-black">
            <Image src="/food.avif" alt="Food background" fill className="object-cover opacity-20 z-0" priority />

            <div className="relative z-10 flex min-h-screen">
                {/* Sidebar */}
                <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white border-r-4 border-black p-6 gap-8">
                    <div className="font-pixeboy text-3xl uppercase leading-none tracking-wide">
                        Cook <span className="text-[#FF6B6B]">&amp;</span> Learn
                    </div>

                    <nav className="flex flex-col gap-3">
                        <Link
                            href="/"
                            className="flex items-center gap-3 font-mono font-bold px-3 py-2 rounded-lg border-2 border-transparent hover:border-black hover:bg-amber-100 transition-all"
                        >
                            <Home className="w-5 h-5" /> Home
                        </Link>
                        <span className="flex items-center gap-3 font-mono font-bold px-3 py-2 rounded-lg bg-[#FFD761] border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                            <BookOpenCheck className="w-5 h-5" /> Cookbook
                        </span>
                    </nav>

                    <div className="mt-auto bg-[#A0E7E5] border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="font-pixeboy text-5xl leading-none">{recipes.length}</div>
                        <div className="font-mono text-xs font-bold uppercase mt-1">Saved recipes</div>
                    </div>
                </aside>

                {/* Main */}
                <main className="flex-1 px-4 sm:px-8 py-8 space-y-8">
                    {/* Topbar */}
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h1 className="text-4xl sm:text-5xl font-pixeboy uppercase tracking-wide">My Cookbook</h1>
                            <p className="font-mono text-sm text-gray-700 mt-1">
                                {recipes.length} saved {recipes.length === 1 ? "recipe" : "recipes"}
                            </p>
                        </div>
                        {/* Home link (mobile — sidebar hidden) */}
                        <Link
                            href="/"
                            className="md:hidden bg-white border-2 border-black px-4 py-2 rounded-lg font-mono font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 shrink-0"
                        >
                            <Home className="w-4 h-4" /> Home
                        </Link>
                    </div>

                    {recipes.length === 0 ? (
                        <div className="bg-white border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-10 text-center space-y-4 max-w-xl">
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
                </main>
            </div>
        </div>
    );
}
