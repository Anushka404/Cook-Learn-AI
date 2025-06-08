"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

export default function CookingStepsPage() {
    const { videoId } = useParams<{ videoId: string }>();
    const router = useRouter();
    const [hasStarted, setHasStarted] = useState(false);
    const [steps, setSteps] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [stepIndex, setStepIndex] = useState(0);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const deepgram = createClient(process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY!);
    const liveRef = useRef<any>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);

    useEffect(() => {
        const storedSteps = localStorage.getItem(`cook-steps-${videoId}`);
        console.log("Stored steps for video:", storedSteps);
        if (storedSteps) {
            try {
                const parsedSteps = JSON.parse(storedSteps);
                if (Array.isArray(parsedSteps)) {
                    setSteps(parsedSteps);
                }
            } catch (err) {
                console.error("Failed to parse stored steps:", err);
            }
        } else {
            console.warn("No cooking steps found in localStorage");
        }
        setLoading(false);
    }, [videoId]);

    useEffect(() => {
        if (!hasStarted || steps.length === 0 || stepIndex >= steps.length) return;
        playVoice(steps[stepIndex], "en", playbackRate);
    }, [stepIndex, steps, hasStarted, playbackRate]);

    useEffect(() => {
        if (hasStarted) {
            startDeepgramMicRecognition();
        }

        return () => stopDeepgramMicRecognition();
    }, [hasStarted]);

    if (loading) {
        return <div className="text-white text-xl text-center p-6">Loading cooking steps...</div>;
    }

    async function playVoice(text: string, lang: string = "en", speed = 1.0) {
        if (!text || typeof text !== "string") {
            console.error(" Invalid text to speak:", text);
            return;
        }

        try {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }

            const res = await fetch("/api/tts-elevenlabs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, lang }),
            });

            if (!res.ok) {
                const err = await res.text();
                console.error("TTS API Error:", err);
                return;
            }

            const arrayBuffer = await res.arrayBuffer();
            const audioBlob = new Blob([arrayBuffer], { type: "audio/mpeg" });

            if (audioBlob.size === 0) {
                console.warn("Empty audio received from TTS");
                return;
            }

            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.playbackRate = speed;
            audioRef.current = audio;

            audio.onplay = () => setIsSpeaking(true);
            audio.onended = () => {
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);
            };
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

    async function startDeepgramMicRecognition() {
        try {
            const live = deepgram.listen.live({
                model: "nova-3",
                smart_format: true,
                language: "en-IN",
            });

            liveRef.current = live;

            live.on(LiveTranscriptionEvents.Open, async () => {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

                recorder.ondataavailable = (e) => {
                    if (live.getReadyState() === 1) live.send(e.data);
                };

                recorder.start(250);
                streamRef.current = stream;
                recorderRef.current = recorder;
            });

            live.on(LiveTranscriptionEvents.Transcript, (data) => {
                const text = data.channel.alternatives[0]?.transcript;
                if (text && data.is_final) {
                    handleVoiceCommand(text.toLowerCase());
                }
            });

            live.on(LiveTranscriptionEvents.Error, (err) => {
                console.error("[Deepgram Error]", err);
                stopDeepgramMicRecognition();
            });

            live.on(LiveTranscriptionEvents.Close, () => {
                console.log("Deepgram Connection Closed");
            });
        } catch (err) {
            console.error("Deepgram Init Error", err);
        }
    }

    function stopDeepgramMicRecognition() {
        recorderRef.current?.stop();
        streamRef.current?.getTracks().forEach((track) => track.stop());
        liveRef.current?.finish();

        recorderRef.current = null;
        streamRef.current = null;
        liveRef.current = null;
    }

    function handleVoiceCommand(text: string) {
        if (text.includes("next")) {
            nextStep();
        } else if (text.includes("repeat") || text.includes("again")) {
            repeatCurrentStep();
        } else if (text.includes("back") || text.includes("previous")) {
            prevStep();
        } else {
            console.log("Unrecognized command:", text);
            playVoice("Sorry, I didn't understand that. Please try again.", "en", playbackRate);
        }
    }

    function repeatCurrentStep() {
        setStepIndex((prev) => {
            const step = steps[prev];
            if (!step) {
                console.warn("No step to repeat at index", prev);
                return prev;
            }
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            console.log("Repeating step:", prev, step);
            playVoice(step, "en", playbackRate);
            return prev;
        });
    }

    const nextStep = () => {
        if (stepIndex < steps.length - 1) {
            setStepIndex((prev) => {
                const newIndex = prev + 1;
                console.log(" Next step index:", newIndex);
                return newIndex;
            });
        } else {
            alert("You have completed all the steps!");
            localStorage.removeItem(`cook-steps-${videoId}`);
            router.push(`/cook/${videoId}`);
        }
    };

    const prevStep = () => {
        setStepIndex((prev) => {
            if (prev > 0) {
                const newIndex = prev - 1;
                const step = steps[newIndex];
                if (!step) {
                    console.warn("No step found at previous index", newIndex);
                    return prev;
                }
                console.log("Previous step index:", newIndex);
                playVoice(step, "en", playbackRate);
                return newIndex;
            } else {
                alert("You are already at the first step!");
                return prev;
            }
        });
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

                    <div className="flex justify-center gap-4 mt-4">
                        <button
                            onClick={() =>
                                setPlaybackRate((prev) => {
                                    const newRate = Math.max(0.5, prev - 0.25);
                                    if (audioRef.current) {
                                        audioRef.current.playbackRate = newRate;
                                    }
                                    return newRate;
                                })
                            }
                            className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-600"
                        >
                            ⏪ Slower ({playbackRate.toFixed(2)}x)
                        </button>
                        <button
                            onClick={() =>
                                setPlaybackRate((prev) => {
                                    const newRate = Math.min(2.0, prev + 0.25);
                                    if (audioRef.current) {
                                        audioRef.current.playbackRate = newRate;
                                    }
                                    return newRate;
                                })
                            }
                            className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-600"
                        >
                            ⏩ Faster ({playbackRate.toFixed(2)}x)
                        </button>
                    </div>

                    <div className="flex justify-center gap-4 mt-4">
                        <button
                            onClick={prevStep}
                            disabled={isSpeaking}
                            className="mt-6 px-6 py-3 rounded bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                        >
                            Previous Step
                        </button>
                        <button
                            onClick={nextStep}
                            disabled={isSpeaking}
                            className="mt-6 px-6 py-3 rounded bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                        >
                            {stepIndex < steps.length - 1 ? "Next Step" : "Finish Cooking"}
                        </button>
                    </div>

                    <div className="mt-4 animate-pulse text-amber-400">
                        🎙️ Listening for voice commands...
                    </div>
                </>
            )}
        </div>
    );
}
