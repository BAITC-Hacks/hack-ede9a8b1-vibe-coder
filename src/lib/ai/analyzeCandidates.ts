import { z } from "zod";
import type { RecommendationRequest } from "../validation/recommendationSchema";
import type { RecommendationResponse } from "../recommendation/types";

export const analysisSchema = z.object({ candidates: z.array(z.object({
  contractorId: z.string(),
  evidence: z.array(z.string().min(1).max(800)).min(1).max(3),
  explanation: z.string().min(20).max(900),
}).strict()).min(1).max(3) }).strict();
export interface ExplanationInput {
  request: RecommendationRequest;
  candidates: {
    contractorId: string;
    facts: { name: string; city: string; categories: string[]; priceFromKzt: number; languages: string[]; maxHours: number | null; eventFormats: string[] };
    hardMatches: RecommendationResponse["recommendations"][number]["hardMatches"];
    description: string;
    localEvidence: string[];
  }[];
}
export interface ExplanationService { generate(input: ExplanationInput): Promise<unknown> }

export async function enhanceExplanations(result: RecommendationResponse, request: RecommendationRequest, service?: ExplanationService): Promise<RecommendationResponse> {
  if (!result.recommendations.length) return { ...result, meta: { ...result.meta, aiStatus: "skipped" } };
  if (!service) return result;
  const started = performance.now();
  try {
    const input: ExplanationInput = { request, candidates: result.recommendations.map(({ contractor: c, hardMatches, semanticEvidence }) => ({
      contractorId: c.id, facts: { name: c.anon_name, city: c.city, categories: c.categories, priceFromKzt: c.price_from_kzt, languages: c.languages, maxHours: c.max_hours, eventFormats: c.event_formats },
      hardMatches, description: c.description, localEvidence: semanticEvidence,
    })) };
    const parsed = analysisSchema.parse(await service.generate(input));
    const expected = new Map(input.candidates.map(c => [c.contractorId, c]));
    if (parsed.candidates.length !== expected.size || new Set(parsed.candidates.map(c => c.contractorId)).size !== expected.size) throw new Error("Incomplete or duplicate candidates");
    for (const c of parsed.candidates) {
      const source = expected.get(c.contractorId);
      if (!source || c.evidence.some(quote => !source.description.includes(quote))) throw new Error("Unknown ID or ungrounded quote");
    }
    const analysis = new Map(parsed.candidates.map(c => [c.contractorId, c]));
    return { ...result, recommendations: result.recommendations.map(r => ({ ...r, explanation: analysis.get(r.contractor.id)!.explanation, aiEvidence: analysis.get(r.contractor.id)!.evidence, explanationSource: "ai" })),
      meta: { ...result.meta, aiUsed: true, aiStatus: "used", elapsedMs: result.meta.elapsedMs + Math.round(performance.now() - started) } };
  } catch {
    // Do not log profile data, API keys, or raw model output.
    return { ...result, meta: { ...result.meta, aiStatus: "unavailable", elapsedMs: result.meta.elapsedMs + Math.round(performance.now() - started) } };
  }
}
