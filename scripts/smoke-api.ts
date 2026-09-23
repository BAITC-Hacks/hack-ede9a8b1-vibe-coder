import assert from "node:assert/strict";
import { demoScenarios } from "../src/lib/demoScenarios";
async function main() {
  const url = process.env.SMOKE_URL || "http://127.0.0.1:3000/api/recommend";
  for (const [i, demo] of demoScenarios.entries()) {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(demo.request) });
    const body = await response.json();
    assert.equal(response.status, 200); assert.equal(body.status, i === 2 ? "NO_ELIGIBLE_CANDIDATES" : "SUCCESS");
    assert.equal(body.recommendations.length, [3, 2, 0][i]);
    console.log(demo.name, body.status, body.recommendations.map((r: { contractor: { id: string } }) => r.contractor.id), body.rejectionReasons);
  }
  const missing = await fetch(url, { method: "POST", body: JSON.stringify({ ...demoScenarios[0].request, category: "Флорист", city: "Зарубежье" }) });
  assert.equal((await missing.json()).status, "CATEGORY_NOT_FOUND");
  const invalid = await fetch(url, { method: "POST", body: "{" });
  assert.equal(invalid.status, 400);
  console.log("Category missing and invalid JSON passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
