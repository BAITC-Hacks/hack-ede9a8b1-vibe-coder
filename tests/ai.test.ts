import { test } from "node:test";
import assert from "node:assert/strict";
import { enhanceExplanations, type ExplanationService } from "../src/lib/ai/analyzeCandidates";
import { recommend } from "../src/lib/recommendation/recommend";
import { loadContractors } from "../src/lib/data/loadContractors";
import { demoScenarios } from "../src/lib/demoScenarios";
const request = demoScenarios[0].request;
const base = () => recommend(loadContractors(), request);
const valid = () => ({ candidates: base().recommendations.map(r => ({ contractorId: r.contractor.id, evidence: [r.contractor.description.slice(0, 60)], explanation: r.explanation })) });
test("AI sees only finalists, not the catalog; cannot change ranking", async () => {
  let calls = 0;
  const service: ExplanationService = { async generate(input) { calls++; assert.equal(input.candidates.length, 3); return { candidates: valid().candidates.reverse() }; } };
  const before = base(); const after = await enhanceExplanations(before, request, service);
  assert.equal(calls, 1); assert.equal(after.meta.aiUsed, true);
  assert.deepEqual(after.recommendations.map(r => [r.contractor.id, r.score]), before.recommendations.map(r => [r.contractor.id, r.score]));
  assert.ok(after.recommendations.every(r => r.explanationSource === "ai"));
});
test("no key means useful deterministic explanations", async () => {
  const before = base(); assert.deepEqual(await enhanceExplanations(before, request), before);
});
test("no-result states skip AI entirely", async () => {
  let calls = 0;
  const service = { async generate() { calls++; throw new Error("should not run"); } };
  for (const query of [demoScenarios[2].request, { ...request, category: "missing" }]) {
    const result = await enhanceExplanations(recommend(loadContractors(), query), query, service);
    assert.equal(result.meta.aiStatus, "skipped");
  }
  assert.equal(calls, 0);
});
for (const failure of ["network", "timeout", "malformed", "missing", "unknown", "duplicate", "unsupported quote"] as const) test(`AI ${failure} falls back without losing results`, async () => {
  const service = { async generate() {
    if (failure === "network" || failure === "timeout") throw new Error(failure);
    if (failure === "malformed") return "not JSON";
    const output = valid();
    if (failure === "missing") output.candidates.pop();
    if (failure === "unknown") output.candidates[0].contractorId = "invented";
    if (failure === "duplicate") output.candidates[1].contractorId = output.candidates[0].contractorId;
    if (failure === "unsupported quote") output.candidates[0].evidence = ["invented quote"];
    return output;
  } };
  const before = base(); const after = await enhanceExplanations(before, request, service);
  assert.deepEqual(after.recommendations, before.recommendations); assert.equal(after.meta.aiStatus, "unavailable"); assert.equal(after.meta.aiUsed, false);
});
