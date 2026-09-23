import { loadContractors } from "../src/lib/data/loadContractors";
import { demoScenarios } from "../src/lib/demoScenarios";
import { recommend } from "../src/lib/recommendation/recommend";
for (const demo of demoScenarios) {
  const result = recommend(loadContractors(), demo.request);
  console.log(JSON.stringify({ name: demo.name, request: demo.request, status: result.status, partial: result.partial, candidates: result.recommendations.map(r => ({ id: r.contractor.id, name: r.contractor.anon_name, score: r.score })), funnel: result.funnel, reasons: result.rejectionReasons, counterfactuals: result.counterfactuals }, null, 2));
}
