import type { Contractor } from "../data/normalizeContractor";
import type { RecommendationRequest } from "../validation/recommendationSchema";
import type { RejectionReasons, Funnel, RejectionReason } from "./types";
export const normalize = (value: string) => value.normalize("NFKC").toLocaleLowerCase("ru").replaceAll("ё", "е").trim();
const same = (a: string, b: string) => normalize(a) === normalize(b);
const includes = (values: string[], value: string) => values.some(v => same(v, value));
export function filterEligible(profiles: Contractor[], request: RecommendationRequest) {
  let eligible = profiles.filter(c => same(c.city, request.city) && includes(c.categories, request.category));
  const rejectionReasons: RejectionReasons = { busy: 0, format: 0, budget: 0, language: 0, duration: 0 };
  const funnel = { initialCategoryCityCount: eligible.length } as Funnel;
  function stage(reason: RejectionReason, key: keyof Funnel, passes: (c: Contractor) => boolean) {
    const before = eligible.length;
    eligible = eligible.filter(passes);
    rejectionReasons[reason] = before - eligible.length;
    funnel[key] = eligible.length;
  }
  stage("busy", "availableCount", c => !c.busy_dates.includes(request.date));
  stage("format", "formatCompatibleCount", c => includes(c.event_formats, request.eventFormat));
  stage("budget", "budgetCompatibleCount", c => c.price_from_kzt <= request.budgetKzt);
  stage("language", "languageCompatibleCount", c => !request.language || includes(c.languages, request.language));
  stage("duration", "durationCompatibleCount", c => request.durationHours === undefined || c.max_hours === null || c.max_hours >= request.durationHours);
  return { eligible, funnel, rejectionReasons };
}
