"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

export default function CookingStepsPage() {
    const { videoId } = useParams<{ videoId: string }>();
    const router = useRouter();
    const [hasStarted, setHasStarted] = useState(false);
    const [steps, setSteps] = useState<string[]>([]);
    const [stepIndex, setStepIndex] = useState(0);
    const [isSpeaking, setIsSpeaking] = useState(false);

    useEffect(() => {
        setSteps([
            "Boil the pasta in salted water until al dente. Reserve 1 cup of pasta water before draining.",
            "Chop onions, garlic, and mushrooms while pasta cooks.",
            "Sauté garlic and onions in olive oil until translucent.",
            "Add mushrooms, salt, pepper, and cook until soft.",
            "Pour in half-and-half and stir until it thickens.",
            "Mix in the cooked pasta and toss to coat evenly.",
            "Garnish with chopped parsley and serve hot.",
            "Garnish with chopped parsley and serve hot.",
        ]);
    }, []);

    async function playVoice(text: string) {
        try {
            const res = await fetch("/api/tts-elevenlabs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });

            const arrayBuffer = await res.arrayBuffer();
            const audioBlob = new Blob([arrayBuffer], { type: "audio/mpeg" });
            console.log("Blob type:", audioBlob.type); // should be "audio/mpeg"
            console.log("Blob size:", audioBlob.size);
            if (audioBlob.size === 0) {
                console.warn("Empty audio received from ElevenLabs");
                return;
            }

            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            audio.onplay = () => setIsSpeaking(true);
            audio.onended = () => {
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl); // Clean up 
            }
            audio.onerror = (err) => {
                console.error("Audio playback failed", err);
                setIsSpeaking(false);
            };
            await audio.play();

        } catch (error) {
            console.error("Error playing voice:", error);
            setIsSpeaking(false);
        }
    }

    useEffect(() => {
        if (!hasStarted || steps.length === 0 || stepIndex >= steps.length) return;
        playVoice(steps[stepIndex]);
    }, [stepIndex, steps, hasStarted]);

    const nextStep = () => {
        if (stepIndex < steps.length - 1) {
            setStepIndex(prev => prev + 1);
        } else {
            alert("You have completed all the steps!");
            router.push(`/cook/${videoId}`);
        }
    };

    return (
        <div className="p-6 max-w-xl mx-auto text-center text-white">
            {!hasStarted ? (
                <button
                    onClick={() => setHasStarted(true)}
                    className="mt-6 px-6 py-3 rounded bg-amber-600 hover:bg-amber-700"
                >
                    Start Cooking
                </button>
            ) : (
                <>
                    <h1 className="text-2xl font-bold text-amber-500">Let’s Cook!</h1>

                    <div className="mt-6 text-lg bg-gray-800 p-4 rounded shadow-lg min-h-[120px] flex items-center justify-center">
                        {steps[stepIndex] || "You’ve finished all steps!"}
                    </div>

                    <button
                        onClick={nextStep}
                        disabled={isSpeaking}
                        className="mt-6 px-6 py-3 rounded bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                    >
                        {stepIndex < steps.length - 1 ? "Next Step" : "Finish Cooking"}
                    </button>
                </>
            )}
        </div>
    );
}