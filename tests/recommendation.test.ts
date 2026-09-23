import { test } from "node:test";
import assert from "node:assert/strict";
import type { Contractor } from "../src/lib/data/normalizeContractor";
import { normalizeContractor } from "../src/lib/data/normalizeContractor";
import { loadContractors, catalogOptions } from "../src/lib/data/loadContractors";
import { recommend } from "../src/lib/recommendation/recommend";
import { localSemantic } from "../src/lib/recommendation/localSemantic";
import { recommendationSchema } from "../src/lib/validation/recommendationSchema";
import { demoScenarios } from "../src/lib/demoScenarios";

const request = { city: "Алматы", category: "Ведущий", date: "2026-10-15", eventFormat: "свадьба", budgetKzt: 1000 };
const fixture = (overrides: Partial<Contractor> = {}): Contractor => ({ id: "A", anon_name: "Ведущий A", city: "Алматы", categories: ["Ведущий"], city_imputed: false, synthetic: false, price_from_kzt: 500, price_imputed: false, event_formats: ["свадьба"], languages: ["русский"], max_hours: 6, busy_dates: [], description: "Современный стиль. Интеллигентный юмор и импровизация.", ...overrides });

for (const [name, overrides, reason] of [
  ["busy", { busy_dates: [request.date] }, "busy"],
  ["unsupported format", { event_formats: ["корпоратив"] }, "format"],
  ["over budget", { price_from_kzt: 1001 }, "budget"],
] as const) test(`excludes ${name}`, () => {
  const result = recommend([fixture({ ...overrides, ...(reason === "busy" ? { busy_dates: [request.date] } : {}), ...(reason === "format" ? { event_formats: ["корпоратив"] } : {}) } as Partial<Contractor>)], request);
  assert.equal(result.status, "NO_ELIGIBLE_CANDIDATES"); assert.equal(result.rejectionReasons[reason], 1);
});
test("wrong city, abroad and wrong category excluded", () => {
  for (const c of [fixture({ city: "Астана" }), fixture({ city: "Зарубежье" }), fixture({ categories: ["Флорист"] })]) {
    assert.equal(recommend([c], request).status, "CATEGORY_NOT_FOUND");
  }
});
test("category supports multiple values and normalized input", () => {
  assert.equal(recommend([fixture({ categories: ["Фотограф", "Ведущий"] })], { ...request, city: " алматы ", category: "ведущий" }).recommendations.length, 1);
});
test("language enforced only when requested", () => {
  assert.equal(recommend([fixture()], { ...request, language: "казахский" }).rejectionReasons.language, 1);
  assert.equal(recommend([fixture()], request).recommendations.length, 1);
});
test("duration limit enforced inclusively", () => {
  assert.equal(recommend([fixture()], { ...request, durationHours: 7 }).rejectionReasons.duration, 1);
  assert.equal(recommend([fixture()], { ...request, durationHours: 6 }).recommendations.length, 1);
});
test("null max_hours is not tied to on-site duration", () => {
  const result = recommend([fixture({ max_hours: null })], { ...request, durationHours: 12 });
  assert.equal(result.recommendations.length, 1); assert.equal(result.recommendations[0].hardMatches.duration, "not_applicable");
});
test("price equal to budget passes", () => assert.equal(recommend([fixture({ price_from_kzt: 1000 })], request).status, "SUCCESS"));
test("stable order independent of input order, maximum three", () => {
  const profiles = ["D", "C", "A", "B"].map(id => fixture({ id }));
  for (let i = 0; i < 5; i++) {
    const result = recommend(i % 2 ? [...profiles].reverse() : profiles, request);
    assert.deepEqual(result.recommendations.map(r => r.contractor.id), ["A", "B", "C"]);
    assert.equal(result.partial, false);
  }
});
test("lower price wins without preference; semantic relevance wins with preference", () => {
  const profiles = [fixture({ id: "cheap", price_from_kzt: 100, description: "Деловые встречи." }), fixture({ id: "relevant", price_from_kzt: 900 })];
  assert.equal(recommend(profiles, request).recommendations[0].contractor.id, "cheap");
  const ranked = recommend(profiles, { ...request, preference: "импровизация юмор" });
  assert.equal(ranked.recommendations[0].contractor.id, "relevant");
  assert.ok(ranked.recommendations.every(r => r.score >= 0 && r.score <= 1));
});
test("one and two result partial states are honest", () => {
  for (const count of [1, 2]) {
    const result = recommend(Array.from({ length: count }, (_, i) => fixture({ id: String(i) })), request);
    assert.equal(result.status, "SUCCESS"); assert.equal(result.partial, true); assert.equal(result.recommendations.length, count);
  }
});
test("first-failure rejection counts partition the funnel", () => {
  const result = recommend([fixture({ id: "busy", busy_dates: [request.date], price_from_kzt: 9000 }), fixture({ id: "format", event_formats: [] }), fixture({ id: "budget", price_from_kzt: 9000 }), fixture({ id: "language", languages: [] }), fixture({ id: "duration", max_hours: 1 }), fixture()], { ...request, language: "русский", durationHours: 6 });
  assert.deepEqual(Object.values(result.funnel), [6, 5, 4, 3, 2, 1]);
  assert.deepEqual(Object.values(result.rejectionReasons), [1, 1, 1, 1, 1]);
});
test("all constraints pass before semantic scoring", () => {
  const result = recommend([fixture({ busy_dates: [request.date] })], { ...request, preference: "современный юмор импровизация" });
  assert.equal(result.recommendations.length, 0);
});
test("local evidence is a literal profile excerpt; negations not rewarded", () => {
  assert.equal(localSemantic("без пошлых конкурсов", "Пошлые конкурсы").score, 0);
  const description = fixture().description;
  assert.ok(localSemantic("импровизация", description).evidence.every(e => description.includes(e)));
});
test("fallback is specific and transparent about unmatched wishes", () => {
  const r = recommend([fixture()], { ...request, preference: "лазеры" }).recommendations[0];
  assert.equal(r.explanationSource, "fallback"); assert.match(r.explanation, /500/); assert.match(r.explanation, /явных совпадений/);
});
test("schema rejects malformed dates, coerced numbers, zero, infinity and excessive text", () => {
  for (const overrides of [{ date: "2026-02-30" }, { date: "2026-13-01" }, { budgetKzt: "1000" }, { budgetKzt: 0 }, { budgetKzt: Infinity }, { durationHours: -1 }, { preference: "a".repeat(1501) }]) assert.equal(recommendationSchema.safeParse({ ...request, ...overrides }).success, false);
});
test("CSV sanity: 66 profiles, flags, lists, busy dates, nulls", () => {
  const data = loadContractors();
  assert.equal(data.length, 66); assert.equal(new Set(data.map(c => c.id)).size, 66);
  assert.deepEqual(catalogOptions(data).cities, ["Алматы", "Астана", "Зарубежье"]);
  assert.equal(data.filter(c => c.synthetic).length, 13);
  assert.equal(data.filter(c => c.max_hours === null).length, 9);
  assert.ok(data.some(c => c.categories.length > 1));
  assert.ok(data[0].busy_dates.includes("2026-10-01"));
  assert.equal(data[0].price_imputed, true);
  assert.throws(() => normalizeContractor({ id: "invalid" }));
});
test("real demos: dense, rare, zero", () => {
  const [dense, rare, zero] = demoScenarios.map(d => recommend(loadContractors(), d.request));
  assert.equal(dense.status, "SUCCESS"); assert.ok(dense.funnel.durationCompatibleCount > 3);
  assert.equal(rare.partial, true); assert.equal(rare.recommendations.length, 2);
  assert.equal(zero.status, "NO_ELIGIBLE_CANDIDATES"); assert.ok(zero.rejectionReasons.budget > 0);
});

test("real date change excludes the newly busy finalist", () => {
  const data = loadContractors();
  const request = demoScenarios[0].request;
  const first = recommend(data, request);
  const second = recommend(data, { ...request, date: "2026-10-17" });
  assert.deepEqual(first.recommendations.map(r => r.contractor.id), ["HK-44923", "HK-77838", "HK-35215"]);
  assert.deepEqual(second.recommendations.map(r => r.contractor.id), ["HK-77838", "HK-35215", "HK-44733"]);
  const unavailable = data.find(c => c.id === "HK-44923")!;
  assert.equal(unavailable.busy_dates.includes(request.date), false);
  assert.equal(unavailable.busy_dates.includes("2026-10-17"), true);
  assert.ok(second.recommendations.every(r => !r.contractor.busy_dates.includes("2026-10-17")));
});
