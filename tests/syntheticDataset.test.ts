import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "csv-parse/sync";
import { buildSyntheticCsv, SYNTHETIC_PROFILE_COUNT, SYNTHETIC_SEED } from "../scripts/generate-synthetic-profiles";
import { loadContractors } from "../src/lib/data/loadContractors";
import { normalizeContractor } from "../src/lib/data/normalizeContractor";
import { recommend } from "../src/lib/recommendation/recommend";

const dataDirectory = join(process.cwd(), "data");
const originalText = readFileSync(join(dataDirectory, "contractors.csv"), "utf8");
const syntheticText = readFileSync(join(dataDirectory, "contractors.synthetic.csv"), "utf8");
const originalRows: Record<string, string>[] = parse(originalText, { columns: true, bom: true, skip_empty_lines: true });
const syntheticRows: Record<string, string>[] = parse(syntheticText, { columns: true, bom: true, skip_empty_lines: true });
const syntheticProfiles = syntheticRows.map(normalizeContractor);
const supportedCities = new Set(["Алматы", "Астана"]);
const supportedFormats = new Set(["свадьба", "той", "корпоратив", "конференция", "юбилей", "день рождения"]);
const supportedLanguages = new Set(["русский", "казахский", "английский"]);

test("original supplied CSV remains the exact 66-row source file", () => {
  assert.equal(originalRows.length, 66);
  assert.equal(new Set(originalRows.map(row => row.id)).size, 66);
  assert.equal(createHash("sha256").update(originalText).digest("hex"), "6a724b6b7dfb5973343e68ba18dadb60fc807d87e3d78f03ee86fb26cb089f7d");
});

test("separate synthetic CSV is byte-for-byte reproducible from the fixed seed", () => {
  assert.equal(SYNTHETIC_PROFILE_COUNT, 24);
  assert.equal(syntheticText, buildSyntheticCsv(originalText, SYNTHETIC_SEED));
  assert.equal(buildSyntheticCsv(originalText, SYNTHETIC_SEED), buildSyntheticCsv(originalText, SYNTHETIC_SEED));
});

test("every generated row follows the source schema and has safe, supported values", () => {
  assert.equal(syntheticProfiles.length, SYNTHETIC_PROFILE_COUNT);
  assert.deepEqual(Object.keys(syntheticRows[0]), Object.keys(originalRows[0]));
  const originalIds = new Set(originalRows.map(row => row.id));
  const originalNames = new Set(originalRows.map(row => row.anon_name));
  assert.equal(new Set(syntheticProfiles.map(profile => profile.id)).size, syntheticProfiles.length);
  for (const [index, profile] of syntheticProfiles.entries()) {
    assert.equal(profile.id, `SYN-${String(10_001 + index).padStart(5, "0")}`);
    assert.equal(originalIds.has(profile.id), false);
    assert.equal(originalNames.has(profile.anon_name), false);
    assert.equal(profile.synthetic, true);
    assert.equal(profile.city_imputed, false);
    assert.equal(profile.price_imputed, false);
    assert.ok(supportedCities.has(profile.city));
    assert.ok(profile.categories.length > 0 && profile.categories.every(category => originalRows.some(row => row.categories.split("|").includes(category))));
    assert.ok(profile.event_formats.length > 0 && profile.event_formats.every(format => supportedFormats.has(format)));
    assert.ok(profile.languages.length > 0 && profile.languages.every(language => supportedLanguages.has(language)));
    assert.ok(profile.price_from_kzt > 0);
    assert.ok(profile.max_hours === null || (profile.max_hours >= 2 && profile.max_hours <= 12));
    assert.ok(profile.description.trim().length > 0);
    assert.equal(new Set(profile.busy_dates).size, profile.busy_dates.length);
    assert.deepEqual(profile.busy_dates, [...profile.busy_dates].sort());
    assert.ok(profile.busy_dates.every(date => date >= "2026-09-23" && date <= "2026-12-31"));
    const sentenceCount = (profile.description.match(/[.!?](?:\s|$)/g) ?? []).length;
    assert.ok(sentenceCount >= 2 && sentenceCount <= 5, `${profile.id} has ${sentenceCount} sentences`);
  }
});

test("generated calendars follow the specified monthly seasonality for every profile", () => {
  const monthRules = [
    { key: "2026-09", days: 8, min: 3, max: 4 },
    { key: "2026-10", days: 31, min: 10, max: 15 },
    { key: "2026-11", days: 30, min: 9, max: 15 },
    { key: "2026-12", days: 31, min: 22, max: 24 },
  ];
  for (const profile of syntheticProfiles) {
    for (const month of monthRules) {
      const count = profile.busy_dates.filter(date => date.startsWith(month.key)).length;
      assert.ok(count >= month.min && count <= month.max, `${profile.id}: ${month.key} has ${count}/${month.days} busy days`);
    }
  }
});

test("merged in-memory catalog is 66 supplied rows plus 24 separately flagged synthetic rows", () => {
  const catalog = loadContractors();
  assert.equal(catalog.length, 90);
  assert.equal(catalog.filter(profile => profile.synthetic).length, 37);
  assert.equal(new Set(catalog.map(profile => profile.id)).size, 90);
  assert.equal(catalog.filter(profile => profile.id.startsWith("SYN-")).length, 24);
});

test("Astana rare-category gaps are reduced without filling every city-category gap", () => {
  const astanaCount = (category: string) => loadContractors().filter(profile => profile.city === "Астана" && profile.categories.includes(category)).length;
  for (const category of ["Флорист", "Декоратор", "Подарки и сувениры", "Ведущий церемонии", "Фото и видеобудки", "Отель", "Инструменталист", "Банкетный зал"]) {
    assert.ok(astanaCount(category) >= 3 && astanaCount(category) <= 4, `${category} should have a small multi-profile pool`);
  }
  assert.equal(astanaCount("Лайв-бэнд"), 2);
  assert.equal(astanaCount("Загородная площадка"), 0);
});

test("an ordinary Astana videographer query shows original and synthetic profiles together", () => {
  const request = { city: "Астана", category: "Видеограф", eventFormat: "свадьба", date: "2026-09-25", budgetKzt: 700_000 };
  const results = Array.from({ length: 5 }, () => recommend(loadContractors(), request));
  for (const result of results) {
    assert.equal(result.funnel.initialCategoryCityCount, 4);
    assert.equal(result.recommendations.length, 2);
    assert.deepEqual(result.recommendations.map(item => [item.contractor.id, item.contractor.synthetic]), [["SYN-10021", true], ["HK-10990", false]]);
  }
});
