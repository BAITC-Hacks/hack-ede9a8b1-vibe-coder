import { normalize } from "./eligibility";

// Small, explicit Russian stem groups. No generated values affect ranking.
const groups = [
  ["импровизация", /^(импровиз)/], ["современный стиль", /^(современн)/],
  ["юмор", /^(юмор|шутк)/], ["интеллигентность", /^(интеллигент|интеллектуальн)/],
  ["ненавязчивость", /^(ненавязчив|ненапряж)/], ["атмосфера", /^(атмосфер)/],
  ["креативность", /^(креатив|творческ)/], ["энергичность", /^(энерг|динамич)/],
] as const;
const stop = new Set(["нужен", "нужна", "нужно", "хочу", "важно", "очень", "хороший", "хорошей", "ведущий", "мероприятие", "мероприятия", "который", "чтобы", "будет", "меня", "русском", "казахском", "английском"]);
function terms(text: string): string[] {
  // Ignore negated phrases instead of incorrectly rewarding a forbidden attribute.
  const positive = normalize(text).replace(/(?:^|\s)(?:без|не)\s+[^,.!?;\n]*/gu, " ");
  return [...new Set((positive.match(/[\p{L}]+/gu) ?? [])
    .filter(word => word.length >= 4 && !stop.has(word))
    .map(word => groups.find(([, pattern]) => pattern.test(word))?.[0] ?? word))];
}
export function localSemantic(preference: string | undefined, description: string) {
  const requested = terms(preference ?? "");
  const profile = new Set(terms(description));
  const matchedTerms = requested.filter(term => profile.has(term));
  const snippets = description.split(/(?<=[.!?])\s+|[•\n]/u).map(s => s.trim()).filter(Boolean);
  const evidence = snippets.filter(s => terms(s).some(t => matchedTerms.includes(t))).slice(0, 2);
  return { score: requested.length ? matchedTerms.length / requested.length : 0, matchedTerms, evidence };
}
