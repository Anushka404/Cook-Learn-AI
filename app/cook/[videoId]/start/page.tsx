"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { FastForward, Rewind, Mic } from "lucide-react";

export default function CookingStepsPage() {
    const { videoId } = useParams<{ videoId: string }>();
    const router = useRouter();
    const [hasStarted, setHasStarted] = useState(false);
    const [steps, setSteps] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [stepIndex, setStepIndex] = useState(0);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [repeatTrigger, setRepeatTrigger] = useState(false);
    const [liveSubtitle, setLiveSubtitle] = useState("");
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const subtitleRef = useRef("");

    const deepgram = createClient(process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY!);
    const liveRef = useRef<any>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const wordToNumber: Record<string, number> = {
        one: 1, two: 2, three: 3, four: 4, five: 5,
        six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
        eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    };    

    useEffect(() => {
        const storedSteps = localStorage.getItem(`cook-steps-${videoId}`);
        // console.log("Stored steps for video:", storedSteps);
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
    }, [stepIndex, steps, hasStarted, playbackRate, repeatTrigger]);

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

            const res = await fetch("/api/tts", {
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
        const normalized = text.toLowerCase();

        const knownCommands = [
            "next", "continue", "go on", "forward",
            "repeat", "again", "do it again",
            "back", "previous", "go back",
            "pause", "resume",
            "step", "go to step"
        ];

        const isKnown = knownCommands.some(cmd => normalized.includes(cmd));

        if (isKnown) {
            //known commands
            if (normalized.includes("next") || normalized.includes("continue") || normalized.includes("go on") || normalized.includes("forward")) {
                nextStep();
            } else if (normalized.includes("repeat") || normalized.includes("again") || normalized.includes("do it again")) {
                repeatCurrentStep();
            } else if (normalized.includes("back") || normalized.includes("previous") || normalized.includes("go back")) {
                prevStep();
            } else if (normalized.includes("pause")) {
                pauseAudio();
            } else if (normalized.includes("resume") || normalized.includes("continue")) {
                resumeAudio();
            } else if (normalized.includes("step")) {
                const matchDigit = normalized.match(/step\s+(\d+)/);
                const matchWord = normalized.match(/step\s+(\w+)/);
                let stepNum: number | null = null;
                if (matchDigit) stepNum = parseInt(matchDigit[1]);
                else if (matchWord && wordToNumber[matchWord[1]]) stepNum = wordToNumber[matchWord[1]];
                if (stepNum !== null) goToStep(stepNum - 1);
                else playVoice("Sorry, I couldn't understand the step number.", "en", playbackRate);
            } else {
                playVoice("Sorry, I didn't understand that command.", "en", playbackRate);
            }
        } else {
            // doubt: classify via Gemini
            isDoubtQuestion(normalized).then((isDoubt) => {
                if (isDoubt) {
                    handleDoubtQuestion(normalized);
                } else {
                    playVoice("Sorry, I didn't understand that.", "en", playbackRate);
                }
            });
        }
    }
    

    function repeatCurrentStep() {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        console.log("Repeating step:", stepIndex, steps[stepIndex]);
        setRepeatTrigger((prev) => !prev); 
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
                console.log("Previous step index:", newIndex);
                return newIndex;
            } else {
                alert("You are already at the first step!");
                return prev;
            }
        });
    };

    function pauseAudio() {
        if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
            console.log("Audio paused");
        }
    }

    function resumeAudio() {
        if (audioRef.current && audioRef.current.paused) {
            audioRef.current.play();
            console.log("Audio resumed");
        }
    }

    function goToStep(index: number) {
        if (index >= 0 && index < steps.length) {
            setStepIndex(index);
            console.log(`Jumping to step ${index + 1}`);
        } else {
            playVoice("That step number is out of range.", "en", playbackRate);
        }
    }
    
    async function isDoubtQuestion(text: string): Promise<boolean> {
        try {
            const res = await fetch("/api/classify-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });

            const data = await res.json();
            return res.ok && data.intent === "doubt";
        } catch (err) {
            console.error("Intent classification failed:", err);
            return false;
        }
    }    

    async function handleDoubtQuestion(question: string) {
        try {
            console.log("DOUBT:", question);

            setLiveSubtitle("");
            subtitleRef.current = "";

            const res = await fetch("/api/doubt-resolver", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ videoId, stepIndex, question }),
            });

            if (!res.body) {
                await playVoice("Sorry, I couldn't get a response.", "en", playbackRate);
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;

                subtitleRef.current += chunk;
                setLiveSubtitle(subtitleRef.current);

                await new Promise((r) => setTimeout(r, 0)); 
            }

            const cleanText = fullText
                .replace(/\*\*/g, "")
                .replace(/[_`]/g, "")
                .replace(/\\n/g, "\n")
                .replace(/\s+/g, " ")
                .trim();

            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }

            await playVoice(cleanText, "en", playbackRate);

        } catch (err) {
            console.error("Doubt resolver error:", err);
            await playVoice("There was an error trying to answer your question.", "en", playbackRate);
        }
    }

    return (
        <div className="min-h-screen bg-[#D7B6FF] px-4 py-10 font-mono text-[#1F1F1F]">
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
            {!hasStarted ? (
                <div className="flex items-center justify-center h-full">
                    <button
                        onClick={() => setHasStarted(true)}
                        className="px-6 py-3 bg-[#FFD761] hover:bg-yellow-400 text-black rounded-full font-semibold shadow-lg transition"
                    >
                        🍳 Let’s Begin Cooking
                    </button>
                </div>
            ) : (
                    
                <div className="max-w-5xl mx-auto bg-white border-4 border-black rounded-xl shadow-lg p-6 sm:p-10 space-y-6">
                    <div className="aspect-video w-full border border-black rounded-md overflow-hidden">
                        <iframe
                            src={`https://www.youtube.com/embed/${videoId}`}
                            className="w-full h-full"
                            allowFullScreen
                        />
                    </div>

                    <h1 className="text-3xl font-bold text-[#1F1F1F]">Let’s Cook!</h1>

                    <div className="text-sm text-amber-600 font-medium">
                        Step {stepIndex + 1} of {steps.length}
                    </div>

                    <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                        <div
                            className="h-full bg-amber-500 transition-all duration-300"
                            style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
                        />
                    </div>

                    {liveSubtitle && (
                        <div className="text-amber-700 text-lg bg-yellow-100 p-2 rounded shadow-md font-mono">
                            {liveSubtitle}
                        </div>
                    )}

                    <div
                        key={stepIndex}
                        className="text-lg bg-gray-50 p-4 rounded border border-gray-300 shadow-inner min-h-[120px] flex items-center justify-center"
                    >
                        {steps[stepIndex] || "You’ve finished all steps!"}
                    </div>

                    <div className="flex flex-wrap justify-center gap-4">
                        <button
                            onClick={() =>
                                setPlaybackRate((prev) => {
                                    const newRate = Math.max(0.5, prev - 0.25);
                                    if (audioRef.current) audioRef.current.playbackRate = newRate;
                                    return newRate;
                                })
                            }
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFD761] hover:bg-yellow-400 text-black font-semibold shadow"
                            >
                                <Rewind className="w-4 h-4" /> Slower ({playbackRate.toFixed(2)}x)
                            </button>

                        <button
                            onClick={() =>
                                setPlaybackRate((prev) => {
                                    const newRate = Math.min(2.0, prev + 0.25);
                                    if (audioRef.current) audioRef.current.playbackRate = newRate;
                                    return newRate;
                                })
                            }
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFD761] hover:bg-yellow-400 text-black font-semibold shadow"
                            >
                            Faster ({playbackRate.toFixed(2)}x)  <FastForward className="w-4 h-4" />
                            </button>
                    </div>

                    <div className="flex flex-wrap justify-center gap-4 mt-4">
                        <button
                            onClick={prevStep}
                            disabled={isSpeaking}
                            className="px-6 py-3 rounded-full bg-[#FFB347] hover:bg-[#FFA500] text-white font-bold shadow disabled:opacity-50"
                        >
                            Previous Step
                        </button>
                        <button
                            onClick={nextStep}
                            disabled={isSpeaking}
                            className="px-6 py-3 rounded-full bg-[#FFB347] hover:bg-[#FFA500] text-white font-bold shadow disabled:opacity-50"
                        >
                            {stepIndex < steps.length - 1 ? "Next Step" : "Finish Cooking"}
                        </button>
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-2 animate-pulse text-red-500 font-semibold">
                        <Mic className="w-5 h-5 text-red-500" />
                        Listening for voice commands...
                    </div>
                </div>
            )}
        </div>
    );
      
    
}
