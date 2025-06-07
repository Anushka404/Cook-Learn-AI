"use client"
import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
type SpeechRecognitionEvent = any;

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

    useEffect(() => {
        const storedSteps = localStorage.getItem(`cook-steps-${videoId}`);
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
        if (!hasStarted || steps.length === 0 || stepIndex >= steps.length)
            return;
        playVoice(steps[stepIndex], "en", playbackRate);
    }, [stepIndex, steps, hasStarted, playbackRate]);

    useEffect(() => {
        if (hasStarted) 
            startDeepgramMicRecognition();
    }, [hasStarted]);    

    if (loading) {
        return <div className="text-white text-xl text-center p-6">Loading cooking steps...</div>;
    }

    async function playVoice(text: string, lang: string = "en", speed = 1.0) {
        try {
            //stop any current playing audio
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            const res = await fetch("/api/tts-elevenlabs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, lang }),
            });

            const arrayBuffer = await res.arrayBuffer();
            const audioBlob = new Blob([arrayBuffer], { type: "audio/mpeg" });

            console.log("Blob type:", audioBlob.type);
            console.log("Blob size:", audioBlob.size);

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
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        let chunks: Blob[] = [];

        recorder.ondataavailable = (e) => chunks.push(e.data);

        recorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'audio/wav' });
            const arrayBuffer = await blob.arrayBuffer();
            const base64Audio = btoa(
                new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );

            const res = await fetch('/api/deepgram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio: base64Audio }),
            });

            const data = await res.json();
            console.log("[Deepgram Result]", data.transcript);

            const text = data.transcript.toLowerCase();

            if (text.includes("next")) {
                nextStep();
            } else if (text.includes("repeat") || text.includes("again")) {
                playVoice(steps[stepIndex], "en", playbackRate);
            } else if (text.includes("back") || text.includes("previous")) {
                if (stepIndex > 0) setStepIndex(prev => prev - 1);
            }

            setTimeout(startDeepgramMicRecognition, 1000);
        };

        recorder.start();
        setTimeout(() => {
            if (recorder.state === 'recording') {
                recorder.stop();
            }
        }, 3000);
    }
    
    const nextStep = () => {
        if (stepIndex < steps.length - 1) {
            setStepIndex(prev => prev + 1);
        } else {
            alert("You have completed all the steps!");
            localStorage.removeItem(`cook-steps-${videoId}`);
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

                        <div className="flex justify-center gap-4 mt-4">
                            <button
                                onClick={() => { setPlaybackRate((prev) => {
                                    const newRate = Math.max(0.5, prev - 0.25);
                                    if (audioRef.current) {
                                        audioRef.current.playbackRate = newRate;
                                    }
                                    return newRate;
                                });
                            }}
                                className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-600"
                            >
                                ⏪ Slower ({playbackRate.toFixed(2)}x)
                            </button>

                            <button
                                onClick={() => {
                                    setPlaybackRate((prev) => {
                                        const newRate = Math.max(0.5, prev + 0.25);
                                        if (audioRef.current) {
                                            audioRef.current.playbackRate = newRate;
                                        }
                                        return newRate;
                                    });
                                }}
                                className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-600"
                            >
                                ⏩ Faster ({playbackRate.toFixed(2)}x)
                            </button>
                        </div>

                        {/* Next Step Button */}
                        <button
                            onClick={nextStep}
                            disabled={isSpeaking}
                            className="mt-6 px-6 py-3 rounded bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                        >
                            {stepIndex < steps.length - 1 ? "Next Step" : "Finish Cooking"}
                        </button>
                        {hasStarted && (
                            <div className="mt-4 animate-pulse text-amber-400">
                                🎙️ Listening for voice commands...
                            </div>
                        )}


                </>
            )}
        </div>
    );
}