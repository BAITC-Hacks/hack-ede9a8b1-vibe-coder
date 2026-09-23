import { test } from "node:test";
import assert from "node:assert/strict";
import { createExplanationService } from "../src/lib/ai/openai";
import type { ExplanationInput } from "../src/lib/ai/analyzeCandidates";

test("SDK payload confines qualitative context to excerpts and uses strict Responses output", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "local-sdk-test";
  const input: ExplanationInput = {
    request: { city: "Алматы", date: "2026-10-15", category: "Ведущий", eventFormat: "корпоратив", budgetKzt: 1000 },
    candidates: [{ contractorId: "A", facts: { name: "A", city: "Алматы", categories: ["Ведущий"], priceFromKzt: 500, languages: ["русский"], maxHours: 8, eventFormats: ["корпоратив"] }, hardMatches: { category: true, city: true, available: true, format: true, budget: true, language: null, duration: "not_requested" }, description: "Импровизация. Театральная биография, не относящаяся к пожеланию.", localEvidence: ["Импровизация."] }],
  };
  const output = { candidates: [{ contractorId: "A", evidence: ["Импровизация."], explanation: "От 500 ₸ при бюджете 1000 ₸. В профиле заявлена импровизация." }] };
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    const supplied = JSON.parse(body.input);
    assert.equal(supplied.candidates[0].description, "Импровизация.");
    assert.ok(!body.input.includes("Театральная биография"));
    assert.equal(body.text.format.type, "json_schema");
    assert.equal(body.text.format.strict, true);
    assert.equal(body.store, false);
    return Response.json({ id: "resp_test", object: "response", status: "completed", output: [{ type: "message", id: "msg_test", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify(output), annotations: [] }] }] });
  };
  try {
    assert.deepEqual(await createExplanationService()!.generate(input), output);
    assert.equal(calls, 1);
    assert.ok(input.candidates[0].description.includes("Театральная биография"), "Original profile must not change");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;
  }
});
