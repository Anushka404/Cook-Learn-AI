import { createClient } from "redis";

const redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err: Error) => console.error("Redis Client Error:", err));

// Lazy connection — connects on first use
let connected = false;

export async function getRedisClient() {
    if (!connected) {
        await redisClient.connect();
        connected = true;
        console.log("Connected to Redis");
    }
    return redisClient;
}

export default redisClient;
