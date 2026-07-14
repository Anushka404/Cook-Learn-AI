"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChefHat, Home, BookOpenCheck, Folder, FolderPlus, Play } from "lucide-react";
import TruckLoader from "@/components/TruckLoader";

type SavedRecipe = {
    video_id: string;
    title: string | null;
    thumbnail: string | null;
    created_at: string;
    folder_id: string | null;
};
type FolderType = { id: string; name: string; created_at: string };
type HistoryItem = {
    video_id: string;
    title: string | null;
    thumbnail: string | null;
    last_step_index: number;
    total_steps: number | null;
    status: string;
};

export default function CookbookPage() {
    const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
    const [folders, setFolders] = useState<FolderType[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [activeFolder, setActiveFolder] = useState<string>("all");
    const [newFolder, setNewFolder] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/recipes").then((r) => r.json()).catch(() => ({ recipes: [] })),
            fetch("/api/folders").then((r) => r.json()).catch(() => ({ folders: [] })),
            fetch("/api/history").then((r) => r.json()).catch(() => ({ history: [] })),
        ])
            .then(([rec, fol, his]) => {
                setRecipes(rec.recipes ?? []);
                setFolders(fol.folders ?? []);
                setHistory(his.history ?? []);
            })
            .finally(() => setLoading(false));
    }, []);

    const createFolder = async () => {
        const name = newFolder.trim();
        if (!name) return;
        const res = await fetch("/api/folders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
        });
        if (res.ok) {
            const { folder } = await res.json();
            setFolders((f) => [...f, folder]);
            setNewFolder("");
        }
    };

    const assignFolder = async (videoId: string, folderId: string | null) => {
        setRecipes((rs) => rs.map((r) => (r.video_id === videoId ? { ...r, folder_id: folderId } : r)));
        await fetch(`/api/recipes/${videoId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folderId }),
        }).catch(() => { });
    };

    const inProgress = history.filter((h) => h.status === "in_progress");
    const visibleRecipes =
        activeFolder === "all" ? recipes : recipes.filter((r) => r.folder_id === activeFolder);

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
                <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white border-r-4 border-black p-6 gap-6">
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

                    {/* Folders */}
                    <div className="flex flex-col gap-2">
                        <div className="font-mono text-xs font-bold uppercase text-gray-600">Folders</div>
                        <button
                            onClick={() => setActiveFolder("all")}
                            className={`flex items-center gap-2 font-mono font-bold text-sm px-3 py-1.5 rounded-lg border-2 transition-all text-left ${activeFolder === "all" ? "bg-[#A0E7E5] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "border-transparent hover:border-black hover:bg-amber-100"}`}
                        >
                            <Folder className="w-4 h-4" /> All ({recipes.length})
                        </button>
                        {folders.map((f) => {
                            const count = recipes.filter((r) => r.folder_id === f.id).length;
                            return (
                                <button
                                    key={f.id}
                                    onClick={() => setActiveFolder(f.id)}
                                    className={`flex items-center gap-2 font-mono font-bold text-sm px-3 py-1.5 rounded-lg border-2 transition-all text-left ${activeFolder === f.id ? "bg-[#A0E7E5] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "border-transparent hover:border-black hover:bg-amber-100"}`}
                                >
                                    <Folder className="w-4 h-4" /> <span className="truncate">{f.name}</span>{" "}
                                    <span className="ml-auto">{count}</span>
                                </button>
                            );
                        })}
                        <div className="flex gap-2 mt-1">
                            <input
                                value={newFolder}
                                onChange={(e) => setNewFolder(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && createFolder()}
                                placeholder="New folder"
                                className="min-w-0 flex-1 font-mono text-sm border-2 border-black rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#A0E7E5]"
                            />
                            <button
                                onClick={createFolder}
                                aria-label="Create folder"
                                className="shrink-0 bg-[#FFD761] border-2 border-black rounded-lg px-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
                            >
                                <FolderPlus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

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
                                {visibleRecipes.length} {visibleRecipes.length === 1 ? "recipe" : "recipes"}
                                {activeFolder !== "all" && " in this folder"}
                            </p>
                        </div>
                        <Link
                            href="/"
                            className="md:hidden bg-white border-2 border-black px-4 py-2 rounded-lg font-mono font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 shrink-0"
                        >
                            <Home className="w-4 h-4" /> Home
                        </Link>
                    </div>

                    {/* Continue cooking */}
                    {inProgress.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="font-pixeboy text-2xl uppercase tracking-wide">Continue Cooking</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {inProgress.map((h) => (
                                    <Link
                                        key={h.video_id}
                                        href={`/cook/${h.video_id}/start`}
                                        className="group flex items-center gap-3 bg-white border-4 border-black rounded-xl p-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={h.thumbnail || `https://img.youtube.com/vi/${h.video_id}/hqdefault.jpg`}
                                            alt={h.title || "Recipe"}
                                            className="w-20 h-14 object-cover border-2 border-black rounded shrink-0"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-mono font-bold text-sm truncate">{h.title || "Recipe"}</p>
                                            <p className="font-mono text-xs text-gray-600">
                                                Step {h.last_step_index + 1}{h.total_steps ? ` / ${h.total_steps}` : ""}
                                            </p>
                                        </div>
                                        <div className="shrink-0 w-9 h-9 bg-[#FF6B6B] border-2 border-black rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Play className="w-5 h-5 text-white fill-current" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Recipes */}
                    {visibleRecipes.length === 0 ? (
                        <div className="bg-white border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-10 text-center space-y-4 max-w-xl">
                            <ChefHat className="w-16 h-16 mx-auto" strokeWidth={2} />
                            <p className="font-mono font-bold text-lg">
                                {activeFolder === "all" ? "No saved recipes yet." : "No recipes in this folder."}
                            </p>
                            <Link
                                href="/"
                                className="inline-block bg-[#FF6B6B] text-white font-pixeboy text-2xl py-3 px-6 border-4 border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all"
                            >
                                Cook something
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {visibleRecipes.map((r) => (
                                <div
                                    key={r.video_id}
                                    className="bg-white border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all overflow-hidden flex flex-col"
                                >
                                    <Link href={`/cook/${r.video_id}`} className="group block">
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
                                    {/* Folder assignment */}
                                    <div className="border-t-2 border-black p-2 flex items-center gap-2 bg-amber-50">
                                        <Folder className="w-4 h-4 shrink-0" />
                                        <select
                                            value={r.folder_id ?? ""}
                                            onChange={(e) => assignFolder(r.video_id, e.target.value || null)}
                                            className="min-w-0 flex-1 font-mono text-xs font-bold bg-white border-2 border-black rounded px-2 py-1 focus:outline-none"
                                        >
                                            <option value="">No folder</option>
                                            {folders.map((f) => (
                                                <option key={f.id} value={f.id}>{f.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
