import { FluentRedisVectorStore } from "@langchain/redis";
import { embeddings } from "./embeddings";
import { getRedisClient } from "./redis";

/**
 * Get (or create) a Redis vector store for a given namespace.
 * 
 * Namespace examples:
 *   "cook-{videoId}"  — cooking flow
 *   "lecture-{videoId}" — lecture/summarize flow
 * 
 * Each namespace gets its own Redis index, so different videos
 * don't interfere with each other.
 */
export async function getVectorStore(namespace: string) {
    const client = await getRedisClient();

    return new FluentRedisVectorStore(embeddings, {
        redisClient: client,
        indexName: namespace,
        keyPrefix: `${namespace}:`,
        customSchema: [
            { name: "videoId", type: "tag" },
            { name: "start", type: "numeric" },
            { name: "end", type: "numeric" },
            { name: "mode", type: "tag" },
        ]
    });
}
