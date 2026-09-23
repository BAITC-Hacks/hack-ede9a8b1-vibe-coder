import type { Recommendation } from "@/lib/recommendation/types";
import type { RecommendationRequest } from "@/lib/validation/recommendationSchema";
import { money } from "@/lib/recommendation/explainFallback";
const roleLabels = { PREFERENCE: "Лучше по предпочтениям", BUDGET: "Экономичнее среди альтернатив", ALTERNATIVE: "Альтернативный вариант" } as const;
export function RecommendationCard({ item, request }: { item: Recommendation; request: RecommendationRequest }) {
  const c = item.contractor;
  const { decisionMeta } = item;
  return <article className="card">
    {decisionMeta.role && <div className="card-top"><span className="choice-role">{roleLabels[decisionMeta.role]}</span></div>}
    <h3>{c.anon_name}</h3><p className="card-meta">{request.category} · {c.city}</p>
    {c.synthetic && <span className="synthetic">Синтетический профиль</span>}
    <p className="price"><small>от </small>{money(c.price_from_kzt)}</p>
    {(c.city_imputed || c.price_imputed) && <p className="imputed">{[c.city_imputed && "Город восстановлен", c.price_imputed && "Цена восстановлена"].filter(Boolean).join(" · ")} в датасете</p>}
    <ul className="checks"><li>Свободен по каталогу на {request.date.split("-").reverse().join(".")}</li><li>Формат: {request.eventFormat}</li><li>В пределах бюджета</li>{request.language && <li>Язык: {request.language}</li>}{request.durationHours !== undefined && <li>{c.max_hours === null ? "Длительность неприменима по каталогу" : `${request.durationHours} ч — в пределах лимита ${c.max_hours} ч`}</li>}</ul>
    <div className="why"><p className="eyebrow">ПОЧЕМУ ПОДХОДИТ</p><p>{item.explanation}</p><span className="source">{item.explanationSource === "ai" ? "Пояснение OpenAI · по данным профиля" : "Пояснение по данным каталога"}</span></div>
    {decisionMeta.savingVsMostExpensiveSelectedKzt > 0 && <p className="decision-tradeoff">На {money(decisionMeta.savingVsMostExpensiveSelectedKzt)} дешевле самого дорогого варианта в коротком списке.</p>}
    <details><summary>Основания выбора</summary><p>Языки: {c.languages.join(", ")}. Категории: {c.categories.join(", ")}.</p>{item.matchedTerms.length > 0 && <p>Совпали термины: {item.matchedTerms.join(", ")}.</p>}{(item.aiEvidence ?? item.semanticEvidence).map((quote, i) => <blockquote key={i}>{quote}</blockquote>)}<p className="source">Выбран методом {decisionMeta.paretoRank === null ? "одной цели" : `Pareto-слоёв (уровень ${decisionMeta.paretoRank})`}. ID: {c.id}</p><p>{c.description}</p></details>
  </article>;
}
