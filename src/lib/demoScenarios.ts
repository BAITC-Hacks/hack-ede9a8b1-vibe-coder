import type { RecommendationRequest } from "./validation/recommendationSchema";
const base = { city: "Алматы", date: "2026-10-15", eventFormat: "корпоратив", category: "Ведущий", budgetKzt: 1_500_000 };
export const demoScenarios: { name: string; request: RecommendationRequest }[] = [
  { name: "Много кандидатов", request: { ...base, preference: "Современный интеллигентный ведущий с импровизацией и юмором" } },
  { name: "Редкая категория", request: { ...base, category: "Флорист", eventFormat: "свадьба", budgetKzt: 300_000, durationHours: 10 } },
  { name: "Никто не подходит", request: { ...base, budgetKzt: 100_000 } },
];
