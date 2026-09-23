import { z } from "zod";

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Укажите существующую дату");
export const recommendationSchema = z.object({
  city: z.string().trim().min(1).max(100),
  date: dateSchema,
  eventFormat: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(100),
  budgetKzt: z.number().finite().int().positive().max(1_000_000_000),
  durationHours: z.number().finite().positive().max(168).optional(),
  language: z.string().trim().min(1).max(100).optional(),
  preference: z.string().trim().max(1500).optional(),
}).strict();
export type RecommendationRequest = z.infer<typeof recommendationSchema>;
