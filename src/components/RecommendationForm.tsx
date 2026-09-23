"use client";
import { useRef, useState } from "react";
import type { CatalogOptions } from "@/lib/data/loadContractors";
import type { RecommendationResponse } from "@/lib/recommendation/types";
import type { RecommendationRequest } from "@/lib/validation/recommendationSchema";
import { demoScenarios } from "@/lib/demoScenarios";
import { RecommendationCard } from "./RecommendationCard";
import { DecisionTrace } from "./DecisionTrace";

function CounterfactualPanel({ suggestions }: { suggestions: RecommendationResponse["counterfactuals"] }) {
  if (!suggestions.length) return null;
  const title: Record<typeof suggestions[number]["type"], string> = { BUDGET: "Бюджет", DATE: "Дата", DURATION: "Длительность", LANGUAGE: "Язык" };
  const value = (suggestion: typeof suggestions[number]) => {
    if (suggestion.type === "BUDGET") return `${suggestion.from.toLocaleString("ru-RU")} ₸ → ${suggestion.to.toLocaleString("ru-RU")} ₸`;
    if (suggestion.type === "DATE") return `${suggestion.from} → ${suggestion.to}`;
    if (suggestion.type === "DURATION") return `${suggestion.from} ч → ${suggestion.to} ч`;
    return `«${suggestion.from}» → без обязательного языка`;
  };
  return <section className="counterfactuals" aria-label="Что можно изменить"><h3>Что можно изменить?</h3>{suggestions.map(suggestion => <div className="counterfactual" key={suggestion.type}><strong>{title[suggestion.type]}</strong><span>{value(suggestion)}</span><p>{suggestion.explanation}</p></div>)}</section>;
}

export function RecommendationForm({ options }: { options: CatalogOptions }) {
  const [input, setInput] = useState<RecommendationRequest>(demoScenarios[0].request);
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [submitted, setSubmitted] = useState(input);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);
  const update = <K extends keyof RecommendationRequest>(key: K, value: RecommendationRequest[K]) => { setInput(previous => ({ ...previous, [key]: value })); setResult(null); setError(""); };
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(""); setResult(null); setSubmitted(input);
    try {
      const response = await fetch("/api/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: AbortSignal.timeout(15000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Не удалось выполнить подбор. Повторите запрос.");
      setResult(data); requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (failure) { setError(failure instanceof Error && failure.name !== "TimeoutError" ? failure.message : "Сервер не ответил за 15 секунд. Повторите подбор."); }
    finally { setLoading(false); }
  }
  function select(key: "city" | "category" | "eventFormat" | "language", label: string, values: string[], optional = false) {
    return <label>{label}<select value={input[key] ?? ""} onChange={e => update(key, e.target.value || undefined)} required={!optional}>{optional && <option value="">Любой язык</option>}{values.map(value => <option key={value} value={value}>{value}</option>)}</select></label>;
  }
  return <><div className="workspace"><section className="form-panel"><div className="section-heading"><span className="step">01</span><div><h2>Расскажите о событии</h2><p>Начнём с условий, которые нельзя упустить.</p></div></div>
    <form onSubmit={submit}><fieldset disabled={loading}><div className="form-grid">
      {select("city", "Город", options.cities)}<label>Дата события<input type="date" required value={input.date} onChange={e => update("date", e.target.value)} /></label>
      {select("eventFormat", "Формат события", options.formats)}{select("category", "Кого ищем", options.categories)}
      <label className="full">Бюджет, ₸ <span className="label-note">на одного подрядчика</span><input type="number" min="1" max="1000000000" step="1" required value={input.budgetKzt || ""} onChange={e => update("budgetKzt", Number(e.target.value))} /></label>
      <label>Длительность, ч · необязательно<input type="number" min="0.5" max="168" step="0.5" placeholder="Не указана" value={input.durationHours ?? ""} onChange={e => update("durationHours", e.target.value ? Number(e.target.value) : undefined)} /></label>
      {select("language", "Язык · необязательно", options.languages, true)}
      <label className="full">Что для вас важно? · необязательно<textarea rows={3} maxLength={1500} placeholder="Например, современная подача и ненавязчивый юмор" value={input.preference ?? ""} onChange={e => update("preference", e.target.value)} /><span className="hint">Обязательные язык и длительность укажите в полях выше. Явные отрицания исключаются из оценки; выполнение запретов не проверяется.</span></label>
    </div><button className="submit" type="submit">{loading ? "Подбираем и готовим пояснения…" : "Подобрать подрядчиков"}<span aria-hidden="true">↗</span></button><p className="form-note">Только профили из каталога. До трёх рекомендаций.</p></fieldset></form>
    {error && <p role="alert" className="error">{error}</p>}
  </section><aside className="side-panel"><p className="eyebrow">НЕ ПРОСТО СПИСОК ИМЁН</p><h2>У каждого выбора<br />есть основание.</h2><div className="principle"><span>01</span><div><h3>Сначала условия</h3><p>Город, дата, формат и бюджет. Занятые и неподходящие исключаются.</p></div></div><div className="principle"><span>02</span><div><h3>Затем ваши пожелания</h3><p>Сравниваем слова и понятия с описаниями. Сортируем по прозрачной формуле.</p></div></div><div className="principle"><span>03</span><div><h3>Выбор с объяснением</h3><p>Показываем факты из профиля и причины, по которым он подходит.</p></div></div><div className="demos"><p className="eyebrow">ПОПРОБУЙТЕ СЦЕНАРИЙ</p>{demoScenarios.map((demo, i) => <button disabled={loading} type="button" key={demo.name} onClick={() => { setInput({ ...demo.request }); setResult(null); setError(""); }}><span>{i + 1}. {demo.name}</span><span>↗</span></button>)}<p className="hint">Сценарий заполняет форму. Нажмите «Подобрать».</p></div></aside></div>
  <div ref={resultRef} className="results" aria-live="polite" aria-busy={loading}>{loading && <p className="loading">Проверяем каталог и готовим объяснения…</p>}{result && <><DecisionTrace result={result} /><div className="result-heading"><span className="step">02</span><div><h2>{result.status === "SUCCESS" ? "Ваш короткий список" : result.status === "CATEGORY_NOT_FOUND" ? "Такой категории здесь пока нет" : "Условия оказались слишком строгими"}</h2><p>{result.summary}</p></div></div>{result.meta.aiStatus === "unavailable" && <p className="notice">AI-пояснения сейчас недоступны. Рекомендации и объяснения по данным каталога готовы.</p>}{result.recommendations.length ? <div className="cards">{result.recommendations.map((item, i) => <RecommendationCard key={item.contractor.id} item={item} index={i} request={submitted} />)}</div> : <div className="empty">Измените условия в форме выше — мы проверим каталог заново.</div>}<CounterfactualPanel suggestions={result.counterfactuals} /></>}</div></>;
}
