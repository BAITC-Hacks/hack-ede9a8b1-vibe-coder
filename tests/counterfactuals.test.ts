import { test } from "node:test";
import assert from "node:assert/strict";
import type { Contractor } from "../src/lib/data/normalizeContractor";
import { recommend } from "../src/lib/recommendation/recommend";
import { filterEligible } from "../src/lib/recommendation/eligibility";
import { loadContractors } from "../src/lib/data/loadContractors";
import { demoScenarios } from "../src/lib/demoScenarios";

const base = { city: "Алматы", category: "Ведущий", date: "2026-10-15", eventFormat: "свадьба", budgetKzt: 1_000 };
const profile = (id: string, overrides: Partial<Contractor> = {}): Contractor => ({
  id, anon_name: id, city: "Алматы", categories: ["Ведущий"], city_imputed: false, synthetic: false,
  price_from_kzt: 500, price_imputed: false, event_formats: ["свадьба"], languages: ["русский"], max_hours: null,
  busy_dates: [], description: "Профиль из каталога.", ...overrides,
});

test("budget uses the smallest actual price threshold and verifies newly eligible IDs", () => {
  const profiles = [profile("threshold", { price_from_kzt: 600 }), profile("later", { price_from_kzt: 900 })];
  const result = recommend(profiles, { ...base, budgetKzt: 500 });
  const budget = result.counterfactuals.find(item => item.type === "BUDGET");
  assert.equal(result.recommendations.length, 0);
  assert.ok(budget && budget.type === "BUDGET");
  assert.equal(budget.to, 600);
  assert.deepEqual(budget.addedContractorIds, ["threshold"]);
  assert.equal(filterEligible(profiles, { ...base, budgetKzt: budget.to }).eligible.length, budget.resultingCount);
  assert.ok(result.recommendations.length <= 3);
});

test("date picks nearest qualifying day and later date on an equal-distance tie", () => {
  const profiles = ["one", "two", "three"].map(id => profile(id, { busy_dates: ["2026-10-01", "2026-10-15", "2026-10-31"] }));
  const result = recommend(profiles, base);
  const date = result.counterfactuals.find(item => item.type === "DATE");
  assert.ok(date && date.type === "DATE");
  assert.equal(date.to, "2026-10-16");
  assert.equal(date.deltaDays, 1);
  assert.deepEqual(date.addedContractorIds, ["one", "three", "two"]);
  assert.equal(filterEligible(profiles, { ...base, date: date.to }).eligible.length, 3);
  assert.deepEqual(recommend(profiles, base).counterfactuals, result.counterfactuals);
});

test("duration chooses the largest lower max_hours threshold reaching three; null remains eligible", () => {
  const profiles = [profile("a", { max_hours: 10 }), profile("b", { max_hours: null }), profile("c", { max_hours: 6 }), profile("d", { max_hours: 4 })];
  const result = recommend(profiles, { ...base, durationHours: 10 });
  const duration = result.counterfactuals.find(item => item.type === "DURATION");
  assert.equal(result.recommendations.length, 2);
  assert.ok(duration && duration.type === "DURATION");
  assert.equal(duration.to, 6);
  assert.equal(duration.resultingCount, 3);
  assert.deepEqual(duration.addedContractorIds, ["c"]);
  assert.equal(recommend(profiles, { ...base, durationHours: duration.to }).recommendations.length, 3);
});

test("language relaxation removes only that requirement and is omitted when it cannot improve", () => {
  const profiles = [profile("kaz1", { languages: ["казахский"] }), profile("kaz2", { languages: ["казахский"] }), profile("rus", { languages: ["русский"] })];
  const result = recommend(profiles, { ...base, language: "казахский" });
  const language = result.counterfactuals.find(item => item.type === "LANGUAGE");
  assert.ok(language && language.type === "LANGUAGE");
  assert.equal(language.to, null);
  assert.equal(language.resultingCount, 3);
  assert.deepEqual(language.addedContractorIds, ["rus"]);
  const unchanged = recommend([profile("one")], { ...base, language: "русский" });
  assert.equal(unchanged.counterfactuals.some(item => item.type === "LANGUAGE"), false);
});

test("CATEGORY_NOT_FOUND remains distinct and has no relaxations", () => {
  const result = recommend([profile("a")], { ...base, category: "Флорист" });
  assert.equal(result.status, "CATEGORY_NOT_FOUND");
  assert.deepEqual(result.counterfactuals, []);
});

test("three-or-more eligible profiles yield at most three cards and no counterfactuals", () => {
  const result = recommend([profile("d"), profile("c"), profile("b"), profile("a")], base);
  assert.equal(result.recommendations.length, 3);
  assert.deepEqual(result.counterfactuals, []);
});

test("real zero-result demo keeps its status and reports only verified changes", () => {
  const profiles = loadContractors();
  const request = demoScenarios[2].request;
  const result = recommend(profiles, request);
  assert.equal(result.status, "NO_ELIGIBLE_CANDIDATES");
  assert.equal(result.recommendations.length, 0);
  assert.equal(result.counterfactuals[0]?.type, "BUDGET");
  assert.equal(result.counterfactuals[0]?.to, 650_000);
  assert.deepEqual(result.counterfactuals[0]?.addedContractorIds, ["HK-44923"]);
  assert.ok(result.counterfactuals.length <= 2);
  for (const suggestion of result.counterfactuals) {
    const modified = suggestion.type === "BUDGET" ? { ...request, budgetKzt: suggestion.to }
      : suggestion.type === "DATE" ? { ...request, date: suggestion.to }
      : suggestion.type === "DURATION" ? { ...request, durationHours: suggestion.to }
      : { city: request.city, date: request.date, eventFormat: request.eventFormat, category: request.category,
        budgetKzt: request.budgetKzt, ...(request.durationHours === undefined ? {} : { durationHours: request.durationHours }),
        ...(request.preference === undefined ? {} : { preference: request.preference }) };
    const rerun = filterEligible(profiles, modified).eligible;
    assert.ok(rerun.length >= 1);
    assert.deepEqual(suggestion.addedContractorIds, rerun.map(item => item.id).sort());
    assert.ok(result.recommendations.length <= 3);
  }
});

test("real partial-result example reaches three by moving to the nearest catalog date", () => {
  const profiles = loadContractors();
  const request = { city: "Астана", category: "Фотограф", date: "2026-10-15", eventFormat: "свадьба", budgetKzt: 10_000_000 };
  const result = recommend(profiles, request);
  assert.deepEqual(result.recommendations.map(item => item.contractor.id), ["HK-98562", "HK-61323"]);
  const date = result.counterfactuals.find(item => item.type === "DATE");
  assert.ok(date && date.type === "DATE");
  assert.equal(date.to, "2026-10-18");
  assert.deepEqual(date.addedContractorIds, ["HK-97737"]);
  assert.equal(recommend(profiles, { ...request, date: date.to }).recommendations.length, 3);
});

test("recommendation cards remain capped at three in original demos and counterfactual order is stable", () => {
  const profiles = loadContractors();
  for (const demo of demoScenarios) {
    const first = recommend(profiles, demo.request);
    const second = recommend(profiles, demo.request);
    assert.ok(first.recommendations.length <= 3);
    assert.deepEqual(first.counterfactuals, second.counterfactuals);
  }
});
