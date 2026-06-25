import OpenAI from "openai";

// Free model on OpenRouter. stepfun/step-3.5-flash:free was retired (now paid-only),
// so all routes share this slug — change it here to swap models everywhere.
export const OPENROUTER_MODEL = "openai/gpt-oss-120b:free";

export const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000", // Required by OpenRouter for free tier
        "X-Title": "Cook & Learn AI",
    },
});
