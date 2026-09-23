import type { Contractor } from "../data/normalizeContractor";
import type { RecommendationRequest } from "../validation/recommendationSchema";
import { filterEligible } from "./eligibility";
import type { CounterfactualSuggestion } from "./types";

const MAX_RECOMMENDATIONS = 3;
const DATE_SEARCH_DAYS = 14;

function calendarDay(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function dateString(day: number): string {
  return new Date(day).toISOString().slice(0, 10);
}

function dateLabel(date: string): string {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(calendarDay(date)));
}

function outcome(count: number): string {
  return count === 1 ? "появится 1 подходящий вариант" : `будут доступны ${count} подходящих варианта`;
}

function addedIds(baseline: Contractor[], next: Contractor[]): string[] {
  const existing = new Set(baseline.map(profile => profile.id));
  return next.map(profile => profile.id).filter(id => !existing.has(id)).sort();
}

function simulate(profiles: Contractor[], request: RecommendationRequest, baseline: Contractor[], target: number) {
  const eligible = filterEligible(profiles, request).eligible;
  if (eligible.length < target) return undefined;
  return { resultingCount: Math.min(MAX_RECOMMENDATIONS, eligible.length), addedContractorIds: addedIds(baseline, eligible) };
}

/**
 * Finds independently minimal, verified one-variable changes. Ordering is fixed
 * by dimension (budget, date, duration, language); no cross-dimension cost is
 * inferred. All simulations reuse the production eligibility filter.
 */
export function analyzeCounterfactuals(profiles: Contractor[], request: RecommendationRequest, baseline: Contractor[]): CounterfactualSuggestion[] {
  const previousCount = baseline.length;
  if (previousCount >= MAX_RECOMMENDATIONS) return [];
  const target = previousCount === 0 ? 1 : MAX_RECOMMENDATIONS;
  const suggestions: CounterfactualSuggestion[] = [];

  const budgets = [...new Set(profiles.map(profile => profile.price_from_kzt).filter(price => price > request.budgetKzt))].sort((a, b) => a - b);
  for (const budget of budgets) {
    const result = simulate(profiles, { ...request, budgetKzt: budget }, baseline, target);
    if (result) {
      suggestions.push({ type: "BUDGET", from: request.budgetKzt, to: budget, previousCount, ...result,
        explanation: `При бюджете ${budget.toLocaleString("ru-RU")} ₸ ${outcome(result.resultingCount)}.` });
      break;
    }
  }

  const supportedDays = profiles.flatMap(profile => profile.busy_dates.map(calendarDay));
  if (supportedDays.length) {
    const minimum = Math.min(...supportedDays);
    const maximum = Math.max(...supportedDays);
    const requestedDay = calendarDay(request.date);
    const nearbyDays = Array.from({ length: DATE_SEARCH_DAYS * 2 + 1 }, (_, index) => index - DATE_SEARCH_DAYS)
      .filter(offset => offset !== 0)
      .map(offset => ({ offset, day: requestedDay + offset * 86_400_000 }))
      .filter(({ day }) => day >= minimum && day <= maximum)
      .sort((a, b) => Math.abs(a.offset) - Math.abs(b.offset) || b.day - a.day);
    for (const { offset, day } of nearbyDays) {
      const date = dateString(day);
      const result = simulate(profiles, { ...request, date }, baseline, target);
      if (result) {
        suggestions.push({ type: "DATE", from: request.date, to: date, deltaDays: offset, previousCount, ...result,
          explanation: `На ${dateLabel(date)} ${outcome(result.resultingCount)}.` });
        break;
      }
    }
  }

  if (request.durationHours !== undefined) {
    const thresholds = [...new Set(profiles.map(profile => profile.max_hours).filter((hours): hours is number => hours !== null && hours < request.durationHours!))]
      .sort((a, b) => b - a);
    for (const duration of thresholds) {
      const result = simulate(profiles, { ...request, durationHours: duration }, baseline, target);
      if (result) {
        suggestions.push({ type: "DURATION", from: request.durationHours, to: duration, previousCount, ...result,
          explanation: `При длительности до ${duration} ч ${outcome(result.resultingCount)}.` });
        break;
      }
    }
  }

  if (request.language) {
    const withoutLanguage = { ...request };
    delete withoutLanguage.language;
    const result = simulate(profiles, withoutLanguage, baseline, target);
    if (result && result.addedContractorIds.length) {
      suggestions.push({ type: "LANGUAGE", from: request.language, to: null, previousCount, ...result,
        explanation: `Без обязательного требования языка «${request.language}» ${outcome(result.resultingCount)}.` });
    }
  }

  // Keep the response concise and stable; dimensions have no shared cost scale.
  return suggestions.slice(0, 2);
}
