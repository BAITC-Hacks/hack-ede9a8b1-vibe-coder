import type { Contractor } from "../data/normalizeContractor";
export type RejectionReason = "busy" | "format" | "budget" | "language" | "duration";
export type RejectionReasons = Record<RejectionReason, number>;
export interface Funnel {
  initialCategoryCityCount: number; availableCount: number; formatCompatibleCount: number;
  budgetCompatibleCount: number; languageCompatibleCount: number; durationCompatibleCount: number;
}
export interface Recommendation {
  contractor: Contractor;
  hardMatches: { city: true; category: true; available: true; format: true; budget: true; language: boolean | null; duration: "within_limit" | "not_applicable" | "not_requested" };
  semanticEvidence: string[];
  matchedTerms: string[];
  explanation: string;
  explanationSource: "ai" | "fallback";
  aiEvidence?: string[];
  decisionMeta: {
    paretoRank: number | null;
    role: "PREFERENCE" | "BUDGET" | "ALTERNATIVE" | null;
    objectives: { budgetEfficiencyBps: number; preferenceFitBps?: number };
    savingVsMostExpensiveSelectedKzt: number;
  };
}
export type DecisionObjective = "budgetEfficiency" | "preferenceFit";
export type DecisionStrategy = "PARETO" | "SINGLE_OBJECTIVE";
export interface DecisionSummary {
  strategy: DecisionStrategy;
  activeObjectives: DecisionObjective[];
}
export type RecommendationDetails = Omit<Recommendation, "decisionMeta">;
export type CounterfactualSuggestion =
  | { type: "BUDGET"; from: number; to: number; previousCount: number; resultingCount: number; addedContractorIds: string[]; explanation: string }
  | { type: "DATE"; from: string; to: string; deltaDays: number; previousCount: number; resultingCount: number; addedContractorIds: string[]; explanation: string }
  | { type: "DURATION"; from: number; to: number; previousCount: number; resultingCount: number; addedContractorIds: string[]; explanation: string }
  | { type: "LANGUAGE"; from: string; to: null; previousCount: number; resultingCount: number; addedContractorIds: string[]; explanation: string };
export interface RecommendationResponse {
  status: "SUCCESS" | "CATEGORY_NOT_FOUND" | "NO_ELIGIBLE_CANDIDATES";
  partial: boolean;
  recommendations: Recommendation[];
  funnel: Funnel;
  rejectionReasons: RejectionReasons;
  summary: string;
  counterfactuals: CounterfactualSuggestion[];
  decision: DecisionSummary;
  meta: { totalProfiles: number; elapsedMs: number; aiElapsedMs?: number; aiUsed: boolean; aiStatus: "disabled" | "skipped" | "used" | "unavailable" };
}
