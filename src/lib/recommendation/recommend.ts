import type { Contractor } from "../data/normalizeContractor";
import { recommendationSchema } from "../validation/recommendationSchema";
import { filterEligible } from "./eligibility";
import { buildCandidateDetails } from "./ranking";
import { analyzeCounterfactuals } from "./counterfactuals";
import { selectDecisionFrontier } from "./decisionFrontier";
import type { RecommendationResponse, RejectionReasons } from "./types";
export const rejectionLabels: Record<keyof RejectionReasons, string> = { busy: "заняты на дату", format: "не поддерживают формат", budget: "выше бюджета", language: "не поддерживают язык", duration: "не подходят по длительности" };
export function recommend(profiles: Contractor[], input: unknown): RecommendationResponse {
  const started = performance.now();
  const request = recommendationSchema.parse(input);
  const { eligible, funnel, rejectionReasons } = filterEligible(profiles, request);
  const frontier = selectDecisionFrontier(eligible, request);
  const detailsById = new Map(buildCandidateDetails(eligible, request).map(candidate => [candidate.contractor.id, candidate]));
  const highestSelectedPrice = Math.max(0, ...frontier.selected.map(candidate => candidate.price));
  const recommendations = frontier.selected.slice(0, 3).flatMap(candidate => {
    const details = detailsById.get(candidate.id);
    if (!details) return [];
    return [{ ...details, decisionMeta: {
      paretoRank: candidate.paretoRank || null,
      role: candidate.role,
      objectives: { budgetEfficiencyBps: candidate.budgetEfficiencyBps, ...(candidate.preferenceFitBps === undefined ? {} : { preferenceFitBps: candidate.preferenceFitBps }) },
      savingVsMostExpensiveSelectedKzt: highestSelectedPrice - candidate.price,
    } }];
  });
  const counterfactuals = funnel.initialCategoryCityCount ? analyzeCounterfactuals(profiles, request, eligible) : [];
  const status = !funnel.initialCategoryCityCount ? "CATEGORY_NOT_FOUND" : !eligible.length ? "NO_ELIGIBLE_CANDIDATES" : "SUCCESS";
  const reasons = Object.entries(rejectionReasons).filter(([, n]) => n).map(([key, n]) => `${n} — ${rejectionLabels[key as keyof RejectionReasons]}`).join("; ");
  const summary = status === "CATEGORY_NOT_FOUND" ? `В городе «${request.city}» нет подрядчиков категории «${request.category}». Выберите другой город или категорию.`
    : status === "NO_ELIGIBLE_CANDIDATES" ? `Найдено ${funnel.initialCategoryCityCount}, но никто не прошёл условия: ${reasons}. Попробуйте другую дату или измените требования.`
    : eligible.length < 3 ? `Подходят только ${eligible.length} из ${funnel.initialCategoryCityCount}. ${reasons ? `Исключены: ${reasons}.` : "Все доступные в этой категории и городе профили показаны."}`
    : `Выбраны 3 из ${eligible.length} подходящих подрядчиков методом ${frontier.strategy === "PARETO" ? "недоминируемой сортировки по бюджету и совпадению с пожеланием" : "сортировки по эффективности бюджета"}.`;
  return { status, partial: status === "SUCCESS" && eligible.length < 3, recommendations, funnel, rejectionReasons, summary, counterfactuals,
    decision: { strategy: frontier.strategy, activeObjectives: frontier.activeObjectives },
    meta: { totalProfiles: profiles.length, elapsedMs: Math.round(performance.now() - started), aiUsed: false, aiStatus: "disabled" } };
}
