import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Rate limiting runs on Upstash Redis (separate from the vector-store Redis). If the
// Upstash env isn't set we fail OPEN (skip limiting) so local dev works before setup.
const redis =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
        ? new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        })
        : null;

if (!redis) {
    console.warn("[ratelimit] Upstash env not set — rate limiting disabled (dev fail-open).");
}

type Tier = "llm" | "standard" | "tts";

// Per-cost-tier sliding windows (per user, per hour). Tune to your quotas.
const limiters: Record<Tier, Ratelimit> | null = redis
    ? {
        llm: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "1 h"), prefix: "rl:llm" }),
        standard: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, "1 h"), prefix: "rl:std" }),
        tts: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(300, "1 h"), prefix: "rl:tts" }),
    }
    : null;

/**
 * Auth + rate-limit guard for API routes. Returns the signed-in userId on success,
 * or a NextResponse (401 / 429) the caller should return immediately.
 *
 *   const guard = await apiGuard("llm");
 *   if (guard instanceof NextResponse) return guard;
 *   // ...use guard.userId
 */
export async function apiGuard(tier: Tier): Promise<{ userId: string } | NextResponse> {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (limiters) {
        const { success, limit, remaining, reset } = await limiters[tier].limit(userId);
        if (!success) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please try again later." },
                {
                    status: 429,
                    headers: {
                        "X-RateLimit-Limit": String(limit),
                        "X-RateLimit-Remaining": String(remaining),
                        "X-RateLimit-Reset": String(reset),
                    },
                }
            );
        }
    }

    return { userId };
}
