import OpenAI from "openai";
import type {
    ChatCompletion,
    ChatCompletionCreateParamsNonStreaming,
} from "openai/resources/chat/completions";

// Free model on OpenRouter. stepfun/step-3.5-flash:free and openai/gpt-oss-120b:free were
// both retired (now paid-only), so all routes share this slug — change it here to swap everywhere.
export const OPENROUTER_MODEL = "openai/gpt-oss-20b:free";

export const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000", // Required by OpenRouter for free tier
        "X-Title": "Cook & Learn AI",
    },
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Worth retrying: rate limits (429), server errors (5xx), and transient network drops
// (ECONNRESET/ETIMEDOUT etc.) — the free OpenRouter endpoint resets connections often.
export function isRetryable(error: any): boolean {
    const status = error?.status;
    const code = error?.code || error?.errno;
    const msg = error?.message || "";
    const isRateLimit = status === 429 || msg.includes("429");
    const isServerErr = typeof status === "number" && status >= 500;
    const isNetwork =
        ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EPIPE", "EAI_AGAIN"].includes(code) ||
        error?.type === "system" ||
        /ECONNRESET|ETIMEDOUT|fetch failed|network|socket hang up/i.test(msg);
    return isRateLimit || isServerErr || isNetwork;
}

// Non-streaming chat completion that retries transient failures with exponential backoff.
// Throws the last error if all attempts fail — callers decide how to surface that.
export async function chatCompletionWithRetry(
    params: ChatCompletionCreateParamsNonStreaming,
    { maxRetries = 4, baseDelayMs = 2000, label = "chat" } = {}
): Promise<ChatCompletion> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await openrouter.chat.completions.create(params);
        } catch (error: any) {
            if (isRetryable(error) && attempt < maxRetries - 1) {
                const backoff = baseDelayMs * Math.pow(2, attempt);
                console.warn(`${label} failed (${error?.code || error?.status || "error"}), retrying in ${backoff}ms (attempt ${attempt + 1})`);
                await sleep(backoff);
            } else {
                throw error;
            }
        }
    }
    throw new Error(`${label}: exhausted retries`); // unreachable; satisfies TS
}
