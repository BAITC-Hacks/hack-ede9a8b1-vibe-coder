import type { Contractor } from "../data/normalizeContractor";
import type { RecommendationRequest } from "../validation/recommendationSchema";
import type { Recommendation } from "./types";
import { localSemantic } from "./localSemantic";
import { explainFallback } from "./explainFallback";

export function rankCandidates(eligible: Contractor[], request: RecommendationRequest): Recommendation[] {
  return eligible.map((contractor): Recommendation => {
    const semantic = localSemantic(request.preference, contractor.description);
    const budget = 1 - contractor.price_from_kzt / request.budgetKzt;
    const score = request.preference?.trim() ? 0.3 * budget + 0.7 * semantic.score : budget;
    return {
      contractor, score, scoreBreakdown: { budget, preference: semantic.score },
      hardMatches: { category: true, city: true, available: true, format: true, budget: true,
        language: request.language ? true : null,
        duration: request.durationHours === undefined ? "not_requested" : contractor.max_hours === null ? "not_applicable" : "within_limit" },
      semanticEvidence: semantic.evidence, matchedTerms: semantic.matchedTerms,
      explanation: explainFallback(contractor, request, semantic.evidence), explanationSource: "fallback",
    };
  }).sort((a, b) => b.score - a.score || a.contractor.price_from_kzt - b.contractor.price_from_kzt || (a.contractor.id < b.contractor.id ? -1 : a.contractor.id > b.contractor.id ? 1 : 0));
}
