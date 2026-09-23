import type { Contractor } from "../data/normalizeContractor";
import type { RecommendationRequest } from "../validation/recommendationSchema";
export const money = (value: number) => new Intl.NumberFormat("ru-RU").format(value) + " ₸";
export function explainFallback(c: Contractor, request: RecommendationRequest, evidence: string[]) {
  const duration = request.durationHours === undefined ? "" : c.max_hours === null
    ? "; длительность неприменима по данным каталога" : `; до ${c.max_hours} ч при запросе ${request.durationHours} ч`;
  const fact = `Поддерживает формат «${request.eventFormat}», языки: ${c.languages.join(", ")}${duration}. Цена от ${money(c.price_from_kzt)} — на ${money(request.budgetKzt - c.price_from_kzt)} ниже лимита.`;
  const quote = evidence[0] ?? c.description.split(/(?<=[.!?])\s+|[•\n]/u).find(s => s.trim()) ?? c.description;
  const excerpt = quote.length > 230 ? quote.slice(0, 227) + "…" : quote;
  return `${fact} В профиле: «${excerpt.trim()}»${request.preference && !evidence.length ? "; явных совпадений с пожеланием локальный поиск не нашёл." : "."}`;
}
