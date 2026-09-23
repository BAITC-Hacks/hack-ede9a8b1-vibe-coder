import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import { normalizeContractor, type Contractor } from "./normalizeContractor";

let cached: Contractor[] | undefined;
export function loadContractors(): Contractor[] {
  if (cached) return cached;
  const dataDirectory = join(process.cwd(), "data");
  const readRows = (filename: string): unknown[] => parse(readFileSync(join(dataDirectory, filename), "utf8"), { columns: true, bom: true, skip_empty_lines: true });
  const originalRows = readRows("contractors.csv");
  const syntheticRows = readRows("contractors.synthetic.csv");
  const profiles = [...originalRows, ...syntheticRows].map(normalizeContractor);
  if (!profiles.length || new Set(profiles.map(c => c.id)).size !== profiles.length) throw new Error("Каталог пуст или содержит повторяющиеся ID");
  cached = profiles;
  return profiles;
}
export function catalogOptions(profiles: Contractor[]) {
  const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, "ru"));
  return {
    cities: unique(profiles.map(c => c.city)), categories: unique(profiles.flatMap(c => c.categories)),
    formats: unique(profiles.flatMap(c => c.event_formats)), languages: unique(profiles.flatMap(c => c.languages)),
  };
}
export type CatalogOptions = ReturnType<typeof catalogOptions>;
