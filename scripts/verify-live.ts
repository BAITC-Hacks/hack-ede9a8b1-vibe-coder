// Explicit, paid verification only: never part of npm test.
// node --env-file=.env.local --import tsx scripts/verify-live.ts
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { demoScenarios } from "../src/lib/demoScenarios";
import { loadContractors } from "../src/lib/data/loadContractors";
import { recommend } from "../src/lib/recommendation/recommend";
import type { RecommendationResponse } from "../src/lib/recommendation/types";

async function main() {
  const input = demoScenarios[0].request;
  const expected = recommend(loadContractors(), input).recommendations.map(r => r.contractor.id);
  const url = process.env.VERIFY_URL || "http://127.0.0.1:3000/api/recommend";
  const reports = [];
  for (let run = 1; run <= Number(process.env.VERIFY_RUNS || 5); run++) {
    const start = performance.now();
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: AbortSignal.timeout(15000) });
    const raw = await response.text();
    if (process.env.OPENAI_API_KEY) assert.ok(!raw.includes(process.env.OPENAI_API_KEY), "Secret appeared in API response");
    assert.equal(response.status, 200);
    const result: RecommendationResponse = JSON.parse(raw);
    const ids = result.recommendations.map(r => r.contractor.id);
    const report = { run, model: process.env.OPENAI_MODEL || "gpt-4.1-mini", http: response.status, totalMs: Math.round(performance.now() - start), ...result.meta, ids, finalists: result.recommendations.map(r => ({ id: r.contractor.id, source: r.explanationSource, explanation: r.explanation, evidence: r.aiEvidence })) };
    reports.push(report);
    console.log(JSON.stringify(report));
    if (process.env.VERIFY_REPORT) writeFileSync(process.env.VERIFY_REPORT, JSON.stringify(reports, null, 2));
    assert.deepEqual(result.recommendations.map(r => r.contractor.id), expected);
    const shouldFail = process.env.VERIFY_FALLBACK === "1" || (process.env.VERIFY_ALLOW_FALLBACK === "1" && result.meta.aiStatus === "unavailable");
    assert.equal(result.meta.aiUsed, !shouldFail);
    assert.equal(result.meta.aiStatus, shouldFail ? "unavailable" : "used");
    for (const r of result.recommendations) {
      assert.equal(r.explanationSource, shouldFail ? "fallback" : "ai");
      if (!shouldFail) assert.ok(r.aiEvidence?.length && r.aiEvidence.every(quote => r.contractor.description.includes(quote)));
    }
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Verification failed"); process.exitCode = 1; });
