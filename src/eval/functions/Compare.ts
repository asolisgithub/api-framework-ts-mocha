import { VoyageAIClient } from "voyageai";
import { cosineSimilarity } from "fast-cosine-similarity";

const client = new VoyageAIClient({ apiKey: process.env["VOYAGE_API_KEY"] });

export async function calculateSimilarity(candidate: string, reference: string): Promise<number> {
  try {
    const response = await client.embed({
      input: [candidate, reference],
      model: process.env["VOYAGE_MODEL"] || "voyage-3",
    });

    if (response.data?.length === 2) {
      const candidateEmbedding = response.data[0]?.embedding;
      const referenceEmbedding = response.data[1]?.embedding;
      return cosineSimilarity(candidateEmbedding as number[], referenceEmbedding as number[]);
    } else {
      throw new Error("Could not extract embeddings from API response");
    }
  } catch (error) {
    console.error("Error calculating similarity:", error);
    throw new Error("Failed to calculate similarity");
  }
}
