import { test } from "node:test";
import assert from "node:assert/strict";
import { localSemantic } from "../src/lib/recommendation/localSemantic";

test("positive improvisation and humor still contribute", () => {
  const match = localSemantic("с импровизацией и юмором", "Импровизация и живой юмор.");
  assert.equal(match.score, 1);
  assert.deepEqual(match.matchedTerms, ["импровизация", "юмор"]);
});

for (const phrase of ["без конкурсов", "не нужен юмор", "не хочу импровизацию", "никаких конкурсов", "избегать конкурсов", "БЕЗ ПОШЛЫХ КОНКУРСОВ", "Стиль:без конкурсов"]) {
  test(`negative clause gets no positive credit: ${phrase}`, () => {
    // Include exact inflections as well as synonyms: success cannot rely on lack of stemming.
    const match = localSemantic(phrase, "Конкурсов конкурсы юмор импровизация импровизацию пошлых стиль.");
    assert.equal(match.matchedTerms.includes("конкурсов"), false);
    assert.equal(match.matchedTerms.includes("юмор"), false);
    assert.equal(match.matchedTerms.includes("импровизация"), false);
    if (!phrase.startsWith("Стиль:")) assert.equal(match.score, 0);
  });
}

test("positive clause after a negative clause is preserved", () => {
  const preference = "без пошлых конкурсов, с импровизацией";
  assert.equal(localSemantic(preference, "Пошлых конкурсов конкурсы.").score, 0);
  const match = localSemantic(preference, "Импровизация и конкурсы.");
  assert.equal(match.score, 1);
  assert.deepEqual(match.matchedTerms, ["импровизация"]);
});

test("negative description does not become positive evidence", () => {
  assert.equal(localSemantic("юмор", "Не нужен юмор. Современные интерактивы.").score, 0);
  assert.equal(localSemantic("юмор", "Неоновые декорации. Юмор.").score, 1);
});

test("negation handling is deterministic across punctuation boundaries", () => {
  for (const boundary of [",", ".", ";", ":", "!", "?", "\n", "•"]) {
    const preference = `никаких конкурсов${boundary} с импровизацией`;
    const first = localSemantic(preference, "Конкурсов. Импровизация.");
    assert.equal(first.score, 1);
    assert.deepEqual(first, localSemantic(preference, "Конкурсов. Импровизация."));
  }
});
