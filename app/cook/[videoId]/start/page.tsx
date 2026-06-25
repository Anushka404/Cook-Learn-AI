"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { FastForward, Rewind, Mic, Pause, Play } from "lucide-react";
import Image from "next/image";

export default function CookingStepsPage() {
    const { videoId } = useParams<{ videoId: string }>();
    const router = useRouter();
    const [hasStarted, setHasStarted] = useState(false);
    const [steps, setSteps] = useState<{ step: string; timestamp: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [stepIndex, setStepIndex] = useState(0);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [repeatTrigger, setRepeatTrigger] = useState(false);
    const [liveSubtitle, setLiveSubtitle] = useState("");
    const [currentDoubt, setCurrentDoubt] = useState("");
    const [userTranscript, setUserTranscript] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const isMounted = useRef(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const subtitleRef = useRef("");
    const commandBufferRef = useRef("");
    const commandTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const handleVoiceCommandRef = useRef<((text: string) => void) | null>(null);
    const audioQueueRef = useRef<string[]>([]);
    const isPlayingQueueRef = useRef(false);

    const deepgramRef = useRef<any>(null);
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

        playVoice(steps[stepIndex]?.step || "", "en", playbackRate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stepIndex, steps, hasStarted, repeatTrigger]);

    useEffect(() => {
        if (hasStarted) {
            startDeepgramMicRecognition();
        }

        return () => stopDeepgramMicRecognition();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasStarted]);

    useEffect(() => {
        handleVoiceCommandRef.current = handleVoiceCommand;
    });

    // Cleanup audio on unmount
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

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

            if (!isMounted.current) return; // Stop if unmounted

            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.playbackRate = speed;
            audioRef.current = audio;

            audio.onplay = () => setIsSpeaking(true);
            audio.onpause = () => {
                if (isMounted.current) setIsSpeaking(false);
            };
            audio.onended = () => {
                if (isMounted.current) setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);
            };
            audio.onerror = (err) => {
                console.error("Audio playback failed", err);
                if (isMounted.current) setIsSpeaking(false);
            };

            await audio.play();
        } catch (error) {
            console.error("Error playing voice:", error);
            if (isMounted.current) setIsSpeaking(false);
        }
    }

    async function processAudioQueue() {
        if (isPlayingQueueRef.current || audioQueueRef.current.length === 0) return;

        isPlayingQueueRef.current = true;
        const nextAudioUrl = audioQueueRef.current.shift();

        if (nextAudioUrl) {
            const audio = new Audio(nextAudioUrl);
            audio.playbackRate = playbackRate;
            audioRef.current = audio;

            audio.onplay = () => setIsSpeaking(true);
            audio.onended = () => {
                URL.revokeObjectURL(nextAudioUrl);
                isPlayingQueueRef.current = false;
                processAudioQueue(); // Play next
            };
            audio.onerror = () => {
                isPlayingQueueRef.current = false;
                processAudioQueue(); // Skip error
            };

            await audio.play();
        } else {
            isPlayingQueueRef.current = false;
            setIsSpeaking(false);
        }
    }

    async function speakSentence(text: string) {
        try {
            const res = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, lang: "en" }),
            });

            if (!res.ok) return;

            const arrayBuffer = await res.arrayBuffer();
            const audioBlob = new Blob([arrayBuffer], { type: "audio/mpeg" });
            const audioUrl = URL.createObjectURL(audioBlob);

            audioQueueRef.current.push(audioUrl);
            processAudioQueue();
        } catch (err) {
            console.error("TTS Sentence Error", err);
        }
    }

    async function startDeepgramMicRecognition() {
        try {
            const tokenRes = await fetch("/api/deepgram-token");
            const { access_token } = await tokenRes.json();
            if (!access_token) {
                console.error("Failed to get Deepgram token from server");
                return;
            }

            const deepgram = createClient({ accessToken: access_token });
            deepgramRef.current = deepgram;

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
                if (text && data.is_final && text.trim().length > 0) {
                    if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);

                    commandBufferRef.current += (commandBufferRef.current ? " " : "") + text.trim();
                    setUserTranscript(commandBufferRef.current);

                    commandTimeoutRef.current = setTimeout(() => {
                        const fullCommand = commandBufferRef.current.trim();
                        if (fullCommand) {
                            handleVoiceCommandRef.current?.(fullCommand);
                        }
                        commandBufferRef.current = "";
                        commandTimeoutRef.current = null;

                        // Clear user transcript after a short delay
                        setTimeout(() => setUserTranscript(""), 2000);
                    }, 1000);
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
        if (isProcessing) return;
        const normalized = text.toLowerCase();

        // 1. Check for Audio Controls (always active)
        if (isSpeaking && normalized.includes("pause")) {
            pauseAudio();
            // Clear queue on pause
            audioQueueRef.current = [];
            return;
        }

        // 2. Check for Navigation Commands
        const knownCommands = [
            "next", "continue", "go on", "forward",
            "repeat", "again", "do it again",
            "back", "previous", "go back",
            "pause", "resume", "play",
            "step", "go to step"
        ];
        const isKnown = knownCommands.some(cmd => normalized.includes(cmd));

        if (isKnown) {
            setIsProcessing(true);
            if (normalized.includes("next") || normalized.includes("continue") || normalized.includes("go on") || normalized.includes("forward")) {
                nextStep();
            } else if (normalized.includes("repeat") || normalized.includes("again") || normalized.includes("do it again")) {
                repeatCurrentStep();
            } else if (normalized.includes("back") || normalized.includes("previous") || normalized.includes("go back")) {
                prevStep();
            } else if (normalized.includes("resume") || normalized.includes("continue") || normalized.includes("play")) {
                resumeAudio();
            } else if (normalized.includes("step")) {
                const matchDigit = normalized.match(/step\s+(\d+)/);
                const matchWord = normalized.match(/step\s+(\w+)/);
                let stepNum: number | null = null;
                if (matchDigit) stepNum = parseInt(matchDigit[1]);
                else if (matchWord && wordToNumber[matchWord[1]]) stepNum = wordToNumber[matchWord[1]];
                if (stepNum !== null) goToStep(stepNum - 1);
            }

            setTimeout(() => { if (isMounted.current) setIsProcessing(false); }, 1000);
        } else {
            setIsProcessing(true);
            handleDoubtQuestion(normalized).finally(() => {
                if (isMounted.current) setIsProcessing(false);
            });
        }
    }


    function repeatCurrentStep() {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        console.log("Repeating step:", stepIndex, steps[stepIndex]?.step);
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
            speakSentence("You have completed all the steps! Great job.");
            localStorage.removeItem(`cook-steps-${videoId}`);
            setTimeout(() => router.push(`/cook/${videoId}`), 2500);
        }
    };

    const prevStep = () => {
        setStepIndex((prev) => {
            if (prev > 0) {
                const newIndex = prev - 1;
                console.log("Previous step index:", newIndex);
                return newIndex;
            } else {
                speakSentence("You are already at the first step.");
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
            speakSentence("That step number is out of range.");
        }
    }

    async function handleDoubtQuestion(question: string) {
        try {
            console.log("DOUBT:", question);
            setCurrentDoubt(question);
            setLiveSubtitle("");
            subtitleRef.current = "";

            if (audioRef.current) {
                audioRef.current.pause();
                audioQueueRef.current = []; // Clear previous
            }

            const res = await fetch("/api/doubt-resolver", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ videoId, stepIndex, question }),
            });

            if (!res.body) return;

            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            let sentenceBuffer = "";

            while (true) {
                if (!isMounted.current) break;
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                sentenceBuffer += chunk;

                // Update UI stream
                subtitleRef.current += chunk;
                setLiveSubtitle(subtitleRef.current);

                // Check for sentence endings
                if (sentenceBuffer.match(/[.?!]\s/)) {
                    const sentences = sentenceBuffer.split(/([.?!]\s)/);
                    // Process all complete sentences
                    while (sentences.length > 1) {
                        const s = sentences.shift() || "";
                        const p = sentences.shift() || ""; // the punctuation
                        const fullSentence = (s + p).trim();

                        if (fullSentence.length > 5) { // Avoid noise
                            speakSentence(fullSentence
                                .replace(/\*\*/g, "")
                                .replace(/[_`]/g, "")
                            );
                        }
                    }
                    // Keep the remainder
                    sentenceBuffer = sentences.join("");
                }
            }

            // Flush remaining text
            if (sentenceBuffer.trim().length > 0) {
                speakSentence(sentenceBuffer.trim()
                    .replace(/\*\*/g, "")
                    .replace(/[_`]/g, "")
                );
            }

        } catch (err) {
            console.error("Doubt resolver error:", err);
            speakSentence("Sorry, I had trouble answering that.");
        }
    }
    return (
        <div className="min-h-screen bg-[#D7B6FF] px-4 py-10 font-mono text-[#1F1F1F]">
            {/* Background Image with Overlay */}
            <div className="fixed inset-0 z-0">
                <Image
                    src="/food-bg1.jpg"
                    alt="Food Background"
                    fill
                    className="object-cover opacity-10"
                    priority
                />
            </div>

            {/* Content */}
            <div className="relative z-10 h-full">
                {!hasStarted ? (
                    <div className="flex items-center justify-center h-full min-h-[50vh]">
                        <div className="bg-white border-4 border-black p-8 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center max-w-md">
                            <h1 className="text-4xl font-pixeboy mb-6 uppercase tracking-wider">Ready?</h1>
                            <button
                                onClick={() => setHasStarted(true)}
                                className="w-full bg-[#FFD761] hover:bg-[#ffc933] text-black font-pixeboy text-2xl py-4 px-8 border-4 border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2"
                            >
                                Let’s Begin Cooking 🍳
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-6xl mx-auto space-y-6 relative z-10 pb-20">

                        {/* Header Level */}
                        <div className="flex justify-between items-end">
                            <div>
                                <h1 className="text-5xl font-pixeboy text-black uppercase tracking-wide">Let’s Cook!</h1>
                                <div className="text-xl font-pixeboy text-gray-700 bg-white inline-block border-2 border-black px-3 py-1 rounded mt-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    Step {stepIndex + 1} of {steps.length}
                                </div>
                            </div>
                            <div className="hidden sm:block">
                                <div className="flex items-center gap-2 animate-pulse text-red-600 font-pixeboy text-lg bg-red-100 border-2 border-red-500 px-3 py-1 rounded-lg">
                                    <Mic className="w-5 h-5" />
                                    Listening...
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-4 bg-white rounded-full overflow-hidden border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <div
                                className="h-full bg-[#FF6B6B] transition-all duration-300 ease-out border-r-4 border-black" // Added border-r for segmented look
                                style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
                            />
                        </div>

                        {/* Content Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Video */}
                            <div className="aspect-video w-full bg-black border-4 border-black rounded-xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                                <iframe
                                    src={`https://www.youtube.com/embed/${videoId}`}
                                    className="w-full h-full"
                                    allowFullScreen
                                />
                            </div>

                            {/* Step Text Card */}
                            <div className="bg-white border-4 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 flex flex-col items-center justify-center min-h-[250px] relative">
                                <div className="absolute -top-3 -left-3 bg-[#FFEB99] text-black font-pixeboy text-2xl border-4 border-black w-12 h-12 flex items-center justify-center rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    {stepIndex + 1}
                                </div>

                                <p className="text-xl sm:text-2xl font-bold text-center leading-relaxed font-sans">
                                    {steps[stepIndex]?.step || "You’ve finished all steps!"}
                                </p>
                            </div>
                        </div>

                        {/* User Voice Stream */}
                        {userTranscript && !currentDoubt && !liveSubtitle && (
                            <div className="bg-[#1F1F1F] text-[#E0F7FA] font-mono p-4 rounded-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,50)] relative mt-4">
                                <div className="absolute top-2 left-2 flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse"></div>
                                </div>
                                <div className="pt-4 pl-1">
                                    <span className="text-cyan-400 mr-2 text-sm font-bold">YOU &gt;&gt;</span>
                                    {userTranscript}
                                </div>
                            </div>
                        )}

                        {/* Streaming Output Box */}
                        {(liveSubtitle || currentDoubt) && (
                            <div className="bg-[#1F1F1F] font-mono p-4 rounded-xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,50)] relative mt-4">
                                <div className="absolute top-2 left-2 flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                                </div>
                                <div className="pt-6 pl-1 flex flex-col gap-3">
                                    {currentDoubt && (
                                        <div className="border-b border-gray-700 pb-2">
                                            <span className="text-cyan-400 mr-2 text-sm font-bold">YOU &gt;</span>
                                            <span className="text-[#E0F7FA]">{currentDoubt}</span>
                                        </div>
                                    )}
                                    {liveSubtitle && (
                                        <div>
                                            <span className="text-[#4af626] mr-2 text-sm font-bold">AI CHEF &gt;</span>
                                            <span className="text-[#4af626]">{liveSubtitle}</span>
                                            <span className="animate-pulse">_</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}


                        {/* Controls */}
                        <div className="bg-[#F0F0F0] border-4 border-black p-4 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-6">
                            {/* Speed */}
                            <div className="flex justify-center items-center gap-4">
                                <button
                                    onClick={isSpeaking ? pauseAudio : resumeAudio}
                                    className="w-16 h-16 flex items-center justify-center bg-[#FFD761] hover:bg-[#ffc933] border-4 border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black transition-all transform hover:scale-105"
                                    title={isSpeaking ? "Pause" : "Play"}
                                >
                                    {isSpeaking ? (
                                        <Pause className="w-8 h-8 fill-current" />
                                    ) : (
                                        <Play className="w-8 h-8 fill-current ml-1" />
                                    )}
                                </button>
                                <button
                                    onClick={() =>
                                        setPlaybackRate((prev) => {
                                            const newRate = Math.max(0.5, prev - 0.25);
                                            if (audioRef.current) audioRef.current.playbackRate = newRate;
                                            return newRate;
                                        })
                                    }
                                    className="w-10 h-10 flex items-center justify-center bg-white border-2 border-black rounded-lg hover:bg-gray-100 active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold transition-all"
                                >
                                    <Rewind className="w-4 h-4" />
                                </button>
                                <div className="font-pixeboy text-xl w-24 text-center bg-black text-white py-1 rounded">
                                    {playbackRate.toFixed(2)}x
                                </div>
                                <button
                                    onClick={() =>
                                        setPlaybackRate((prev) => {
                                            const newRate = Math.min(2.0, prev + 0.25);
                                            if (audioRef.current) audioRef.current.playbackRate = newRate;
                                            return newRate;
                                        })
                                    }
                                    className="w-10 h-10 flex items-center justify-center bg-white border-2 border-black rounded-lg hover:bg-gray-100 active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold transition-all"
                                >
                                    <FastForward className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Main Nav */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button
                                    onClick={prevStep}
                                    disabled={isSpeaking}
                                    className="flex-1 bg-white hover:bg-gray-50 text-black font-pixeboy text-xl py-4 border-4 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none disabled:opacity-50 transition-all"
                                >
                                    PREVIOUS
                                </button>
                                <button
                                    onClick={nextStep}
                                    disabled={isSpeaking}
                                    className="flex-[2] bg-[#A0E7E5] hover:bg-[#8CDAD8] text-black font-pixeboy text-xl py-4 border-4 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none disabled:opacity-50 transition-all"
                                >
                                    {stepIndex < steps.length - 1 ? "NEXT STEP" : "FINISH"}
                                </button>
                            </div>
                        </div>

                        <div className="sm:hidden text-center">
                            <div className="inline-flex items-center gap-2 animate-pulse text-red-600 font-pixeboy text-lg bg-red-100 border border-red-500 px-3 py-1 rounded-lg">
                                <Mic className="w-4 h-4" />
                                Listening...
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
