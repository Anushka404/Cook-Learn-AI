export function chunkTranscript(
    transcript: { text: string; start: number }[] | undefined,
    windowSeconds = 300,
    maxWords = 1200
) {
    if (!transcript || transcript.length === 0) {
        console.warn("chunkTranscript: transcript is undefined or empty.");
        return [];
    }

    const chunks: { start: number; end: number; text: string }[] = [];
    let currentChunk: string[] = [];
    let start = transcript[0]?.start ?? 0;
    let lastStart = start;
    let wordCount = 0;

    for (const entry of transcript) {
        const entryWordCount = entry.text.split(" ").length;

        if (
            (entry.start - start >= windowSeconds ||
                wordCount + entryWordCount > maxWords) &&
            currentChunk.length > 0
        ) {
            chunks.push({
                start,
                end: lastStart,
                text: currentChunk.join(" "),
            });

            currentChunk = [];
            wordCount = 0;
            start = entry.start;
        }

        currentChunk.push(entry.text);
        wordCount += entryWordCount;
        lastStart = entry.start;
    }

    if (currentChunk.length > 0) {
        chunks.push({ start, end: lastStart, text: currentChunk.join(" ") });
    }

    return chunks;
} 