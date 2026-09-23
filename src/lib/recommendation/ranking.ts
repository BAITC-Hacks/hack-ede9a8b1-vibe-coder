import type { Contractor } from "../data/normalizeContractor";
import type { RecommendationRequest } from "../validation/recommendationSchema";
import type { RecommendationDetails } from "./types";
import { localSemantic } from "./localSemantic";
import { explainFallback } from "./explainFallback";

interface CandidateAnalysis {
  details: RecommendationDetails;
  budgetFit: number;
  preferenceFit: number;
}
export interface LegacyRankedCandidate extends RecommendationDetails {
  score: number;
  scoreBreakdown: { budget: number; preference: number };
}

function analyzeCandidates(eligible: Contractor[], request: RecommendationRequest): CandidateAnalysis[] {
  return eligible.map((contractor): CandidateAnalysis => {
    const semantic = localSemantic(request.preference, contractor.description);
    const budget = 1 - contractor.price_from_kzt / request.budgetKzt;
    return {
      details: {
        contractor,
        hardMatches: { category: true, city: true, available: true, format: true, budget: true,
          language: request.language ? true : null,
          duration: request.durationHours === undefined ? "not_requested" : contractor.max_hours === null ? "not_applicable" : "within_limit" },
        semanticEvidence: semantic.evidence, matchedTerms: semantic.matchedTerms,
        explanation: explainFallback(contractor, request, semantic.evidence), explanationSource: "fallback",
      },
      budgetFit: budget,
      preferenceFit: semantic.score,
    };
  });
}

export function buildCandidateDetails(eligible: Contractor[], request: RecommendationRequest): RecommendationDetails[] {
  return analyzeCandidates(eligible, request).map(candidate => candidate.details);
}

/** Kept for an explicit before/after diagnostic; production selection uses the Decision Frontier. */
export function rankCandidates(eligible: Contractor[], request: RecommendationRequest): LegacyRankedCandidate[] {
  return analyzeCandidates(eligible, request).map(({ details, budgetFit, preferenceFit }) => ({
    ...details,
    score: request.preference?.trim() ? 0.3 * budgetFit + 0.7 * preferenceFit : budgetFit,
    scoreBreakdown: { budget: budgetFit, preference: preferenceFit },
  })).sort((a, b) => b.score - a.score || a.contractor.price_from_kzt - b.contractor.price_from_kzt || (a.contractor.id < b.contractor.id ? -1 : a.contractor.id > b.contractor.id ? 1 : 0));
}
