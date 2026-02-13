import { CohereEmbeddings } from "@langchain/cohere";

// Using Cohere for embeddings as requested.
// embed-english-v3.0 is optimized for search and retrieval.
export const embeddings = new CohereEmbeddings({
    apiKey: process.env.COHERE_API_KEY,
    model: "embed-english-v3.0",
});
