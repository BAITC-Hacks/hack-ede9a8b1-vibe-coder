import { test } from "node:test";
import assert from "node:assert/strict";
import type { Contractor } from "../src/lib/data/normalizeContractor";
import { loadContractors } from "../src/lib/data/loadContractors";
import { demoScenarios } from "../src/lib/demoScenarios";
import { filterEligible } from "../src/lib/recommendation/eligibility";
import { dominates, crowdingDistances, nonDominatedSort, selectDecisionFrontier, type ObjectiveVector } from "../src/lib/recommendation/decisionFrontier";
import type { DecisionObjective } from "../src/lib/recommendation/types";
import { rankCandidates } from "../src/lib/recommendation/ranking";
import { recommend } from "../src/lib/recommendation/recommend";

const objectives: DecisionObjective[] = ["budgetEfficiency", "preferenceFit"];
const vector = (id: string, budgetEfficiencyBps: number, preferenceFitBps: number, price = 100): ObjectiveVector => ({ id, price, budgetEfficiencyBps, preferenceFitBps });
const request = { city: "Алматы", category: "Ведущий", date: "2026-10-15", eventFormat: "свадьба", budgetKzt: 2_000 };
const profile = (id: string, overrides: Partial<Contractor> = {}): Contractor => ({
  id, anon_name: id, city: "Алматы", categories: ["Ведущий"], city_imputed: false, synthetic: false,
  price_from_kzt: 500, price_imputed: false, event_formats: ["свадьба"], languages: ["русский"], max_hours: null,
  busy_dates: [], description: "Без дополнительных сведений.", ...overrides,
});

test("dominance requires every objective to be no worse and one to be strictly better", () => {
  assert.equal(dominates(vector("A", 10_000, 10_000), vector("B", 8_000, 7_000), objectives), true);
  assert.equal(dominates(vector("A", 10_000, 5_000), vector("B", 7_000, 9_000), objectives), false);
  assert.equal(dominates(vector("A", 5_000, 5_000), vector("B", 5_000, 5_000), objectives), false);
  assert.equal(dominates(vector("B", 5_000, 5_000), vector("A", 5_000, 5_000), objectives), false);
});

test("non-dominated sorting assigns exact fronts deterministically", () => {
  const fronts = nonDominatedSort([
    vector("D", 3_000, 6_000), vector("C", 4_000, 4_000), vector("B", 5_000, 10_000), vector("A", 10_000, 5_000),
  ], [...objectives]);
  assert.deepEqual(fronts.map(front => front.map(candidate => [candidate.id, candidate.paretoRank])), [
    [["A", 1], ["B", 1]], [["C", 2], ["D", 2]],
  ]);
});

test("crowding keeps objective extremes and handles equal ranges, one and two candidates", () => {
  const front = [vector("a", 10_000, 0), vector("b", 7_500, 2_500), vector("c", 5_000, 5_000), vector("d", 2_500, 7_500), vector("e", 0, 10_000)];
  const distances = crowdingDistances(front, [...objectives]);
  assert.equal(distances.get("a"), Number.POSITIVE_INFINITY);
  assert.equal(distances.get("e"), Number.POSITIVE_INFINITY);
  assert.ok((distances.get("c") ?? 0) > 0);
  const identical = [vector("x", 5_000, 5_000), vector("y", 5_000, 5_000), vector("z", 5_000, 5_000)];
  assert.deepEqual([...crowdingDistances(identical, [...objectives]).values()], [0, 0, 0]);
  assert.deepEqual([...crowdingDistances([identical[0]], [...objectives]).values()], [0]);
  const two = crowdingDistances([vector("low", 0, 10_000), vector("high", 10_000, 0)], [...objectives]);
  assert.equal(two.get("low"), Number.POSITIVE_INFINITY);
  assert.equal(two.get("high"), Number.POSITIVE_INFINITY);
  assert.ok([...distances.values()].every(value => !Number.isNaN(value)));
});

test("truncated Pareto front retains extremes and the interior point with greater crowding", () => {
  const words = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "hotel", "india", "juliet", "kilo", "lima", "mike", "november", "oscar", "papa", "quebec", "romeo", "sierra", "tango", "uniform"];
  const prices = [100, 200, 210, 500, 1_100];
  const matched = [0, 3, 10, 18, 20];
  const profiles = prices.map((price, index) => profile(String.fromCharCode(97 + index), {
    price_from_kzt: price,
    description: words.slice(0, matched[index]).join(" ") || "никаких совпадений в описании",
  }));
  const selected = selectDecisionFrontier(profiles, { ...request, preference: words.join(" ") });
  assert.equal(selected.strategy, "PARETO");
  assert.deepEqual(selected.activeObjectives, ["budgetEfficiency", "preferenceFit"]);
  assert.equal(selected.selected.length, 3);
  assert.ok(selected.selected.some(candidate => candidate.id === "a"));
  assert.ok(selected.selected.some(candidate => candidate.id === "e"));
  assert.deepEqual(selected.selected.map(candidate => candidate.id), ["e", "a", "d"]);
  assert.deepEqual(selected.selected.map(candidate => candidate.role), ["PREFERENCE", "BUDGET", "ALTERNATIVE"]);
  assert.ok(selected.selected.every(candidate => candidate.paretoRank === 1));
  assert.ok(selected.selected.every(candidate => candidate.crowdingDistance !== undefined));
});

test("single objective selects by budget efficiency and reports honest strategy", () => {
  const profiles = [profile("costly", { price_from_kzt: 900 }), profile("cheap", { price_from_kzt: 100 }), profile("mid", { price_from_kzt: 500 })];
  const selected = selectDecisionFrontier(profiles, request);
  assert.equal(selected.strategy, "SINGLE_OBJECTIVE");
  assert.deepEqual(selected.activeObjectives, ["budgetEfficiency"]);
  assert.deepEqual(selected.selected.map(candidate => candidate.id), ["cheap", "mid", "costly"]);
  assert.equal(selected.selected[0].budgetEfficiencyBps, 10_000);
  assert.equal(selected.selected[2].budgetEfficiencyBps, 0);
  assert.ok(selected.selected.every(candidate => candidate.paretoRank === 0));
  const samePrice = selectDecisionFrontier([profile("b", { price_from_kzt: 500 }), profile("a", { price_from_kzt: 500 })], request);
  assert.ok(samePrice.selected.every(candidate => candidate.budgetEfficiencyBps === 10_000));
  const response = recommend(profiles, request);
  assert.equal(response.decision.strategy, "SINGLE_OBJECTIVE");
  assert.deepEqual(response.decision.activeObjectives, ["budgetEfficiency"]);
  assert.ok(response.recommendations.every(candidate => candidate.decisionMeta.paretoRank === null && candidate.decisionMeta.objectives.preferenceFitBps === undefined));
});

test("hard-ineligible high-fit profiles never reach the decision frontier", () => {
  const eligible = profile("valid", { price_from_kzt: 400, description: "alpha bravo charlie delta" });
  const profiles = [eligible,
    profile("busy", { busy_dates: [request.date], description: "alpha bravo charlie delta" }),
    profile("over-budget", { price_from_kzt: 3_000, description: "alpha bravo charlie delta" }),
    profile("wrong-format", { event_formats: ["корпоратив"], description: "alpha bravo charlie delta" }),
  ];
  const result = recommend(profiles, { ...request, preference: "alpha bravo charlie delta" });
  assert.deepEqual(result.recommendations.map(item => item.contractor.id), ["valid"]);
  assert.equal(result.decision.strategy, "PARETO");
  assert.equal(result.recommendations[0].decisionMeta.paretoRank, 1);
  assert.equal(result.recommendations[0].decisionMeta.objectives.preferenceFitBps, 10_000);
  assert.equal(result.recommendations.length, filterEligible(profiles, { ...request, preference: "alpha bravo charlie delta" }).eligible.length);
});

test("shortlist stays capped at three for 3, 5, and 10 eligible profiles", () => {
  for (const count of [3, 5, 10]) {
    const profiles = Array.from({ length: count }, (_, index) => profile(`id-${index}`, { price_from_kzt: 100 + index * 100, description: index % 2 ? "alpha bravo" : "charlie delta" }));
    const result = recommend(profiles, { ...request, preference: "alpha bravo charlie delta" });
    assert.ok(result.recommendations.length <= 3);
  }
});

test("repeated dense request preserves selected IDs, roles, ranks and objective values", () => {
  const profiles = loadContractors();
  const request = demoScenarios[0].request;
  const outcomes = Array.from({ length: 5 }, () => recommend(profiles, request));
  for (const result of outcomes.slice(1)) assert.deepEqual(result.recommendations.map(item => ({ id: item.contractor.id, meta: item.decisionMeta })), outcomes[0].recommendations.map(item => ({ id: item.contractor.id, meta: item.decisionMeta })));
});

test("Pareto dense shortlist is compared to the old weighted shortlist", () => {
  const profiles = loadContractors();
  const request = demoScenarios[0].request;
  const eligible = filterEligible(profiles, request).eligible;
  const oldIds = rankCandidates(eligible, request).slice(0, 3).map(candidate => candidate.contractor.id);
  const current = recommend(profiles, request);
  const newIds = current.recommendations.map(candidate => candidate.contractor.id);
  assert.equal(current.recommendations.length, 3);
  assert.notDeepEqual(newIds, oldIds);
  assert.ok(current.recommendations.length <= 3);
  console.log(JSON.stringify({ oldWeightedIds: oldIds, paretoIds: current.recommendations.map(candidate => candidate.contractor.id), decision: current.decision,
    objectives: current.recommendations.map(candidate => ({ id: candidate.contractor.id, price: candidate.contractor.price_from_kzt, ...candidate.decisionMeta })) }));
});

test("dense, rare, zero and date-change demos preserve eligibility and counterfactual behavior", () => {
  const profiles = loadContractors();
  const [dense, rare, zero] = demoScenarios.map(demo => recommend(profiles, demo.request));
  assert.equal(dense.recommendations.length, 3);
  assert.equal(rare.recommendations.length, 2);
  assert.deepEqual(rare.counterfactuals, []);
  assert.equal(zero.recommendations.length, 0);
  assert.equal(zero.counterfactuals[0]?.to, 650_000);
  const moved = recommend(profiles, { ...demoScenarios[0].request, date: "2026-10-17" });
  assert.ok(moved.recommendations.every(item => !item.contractor.busy_dates.includes("2026-10-17")));
  assert.equal(moved.recommendations.length, 3);
});
