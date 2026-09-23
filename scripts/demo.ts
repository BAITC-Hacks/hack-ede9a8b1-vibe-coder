import { loadContractors } from "../src/lib/data/loadContractors";
import { demoScenarios } from "../src/lib/demoScenarios";
import { recommend } from "../src/lib/recommendation/recommend";
const profiles = loadContractors();
for (const demo of demoScenarios) {
  const result = recommend(profiles, demo.request);
  console.log(JSON.stringify({ name: demo.name, totalProfiles: profiles.length, request: demo.request, status: result.status, partial: result.partial, candidates: result.recommendations.map(r => ({ id: r.contractor.id, name: r.contractor.anon_name, synthetic: r.contractor.synthetic, priceKzt: r.contractor.price_from_kzt, decisionMeta: r.decisionMeta })), decision: result.decision, funnel: result.funnel, reasons: result.rejectionReasons, counterfactuals: result.counterfactuals }, null, 2));
}

const mixedSourceRequest = { city: "Астана", date: "2026-09-25", eventFormat: "свадьба", category: "Видеограф", budgetKzt: 700_000 };
const mixedSourceResult = recommend(profiles, mixedSourceRequest);
console.log(JSON.stringify({ name: "Исходный + синтетический профиль", totalProfiles: profiles.length, request: mixedSourceRequest,
  candidates: mixedSourceResult.recommendations.map(r => ({ id: r.contractor.id, name: r.contractor.anon_name, synthetic: r.contractor.synthetic, priceKzt: r.contractor.price_from_kzt })) }, null, 2));
