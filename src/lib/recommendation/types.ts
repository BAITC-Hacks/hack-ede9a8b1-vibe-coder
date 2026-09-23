import type { Contractor } from "../data/normalizeContractor";
export type RejectionReason = "busy" | "format" | "budget" | "language" | "duration";
export type RejectionReasons = Record<RejectionReason, number>;
export interface Funnel {
  initialCategoryCityCount: number; availableCount: number; formatCompatibleCount: number;
  budgetCompatibleCount: number; languageCompatibleCount: number; durationCompatibleCount: number;
}
export interface Recommendation {
  contractor: Contractor;
  score: number;
  scoreBreakdown: { budget: number; preference: number };
  hardMatches: { city: true; category: true; available: true; format: true; budget: true; language: boolean | null; duration: "within_limit" | "not_applicable" | "not_requested" };
  semanticEvidence: string[];
  matchedTerms: string[];
  explanation: string;
  explanationSource: "ai" | "fallback";
  aiEvidence?: string[];
}
export interface RecommendationResponse {
  status: "SUCCESS" | "CATEGORY_NOT_FOUND" | "NO_ELIGIBLE_CANDIDATES";
  partial: boolean;
  recommendations: Recommendation[];
  funnel: Funnel;
  rejectionReasons: RejectionReasons;
  summary: string;
  meta: { totalProfiles: number; elapsedMs: number; aiUsed: boolean; aiStatus: "disabled" | "skipped" | "used" | "unavailable" };
}
