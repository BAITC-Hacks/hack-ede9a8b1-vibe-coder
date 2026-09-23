import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../src/app/api/recommend/route";
import { demoScenarios } from "../src/lib/demoScenarios";
// No network calls: demo tests deliberately run with AI disabled.
test("HTTP route: success, partial, zero, category missing, invalid input", async () => {
  const saved = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    for (const [input, status, count, partial] of [
      [demoScenarios[0].request, "SUCCESS", 3, false],
      [demoScenarios[1].request, "SUCCESS", 2, true],
      [demoScenarios[2].request, "NO_ELIGIBLE_CANDIDATES", 0, false],
      [{ ...demoScenarios[0].request, city: "Зарубежье", category: "Флорист" }, "CATEGORY_NOT_FOUND", 0, false],
    ] as const) {
      const response = await POST(new Request("http://localhost/api/recommend", { method: "POST", body: JSON.stringify(input) }));
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.status, status); assert.equal(body.recommendations.length, count); assert.equal(body.partial, partial);
      assert.ok(Array.isArray(body.counterfactuals));
      assert.ok(["PARETO", "SINGLE_OBJECTIVE"].includes(body.decision.strategy));
      assert.ok(body.recommendations.length <= 3);
      if (status === "NO_ELIGIBLE_CANDIDATES") {
        assert.equal(body.counterfactuals[0]?.type, "BUDGET");
        assert.equal(body.counterfactuals[0]?.to, 650_000);
      }
    }
    for (const body of ["{", "{}", JSON.stringify({ ...demoScenarios[0].request, date: "2026-02-30" })]) {
      const response = await POST(new Request("http://localhost/api/recommend", { method: "POST", body }));
      assert.equal(response.status, 400); assert.equal((await response.json()).error, "INVALID_INPUT");
    }
  } finally { if (saved === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = saved; }
});
