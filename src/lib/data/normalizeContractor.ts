import { z } from "zod";
import { dateSchema } from "../validation/recommendationSchema";

const list = z.string().transform(value => value.split("|").map(x => x.trim()).filter(Boolean)).pipe(z.array(z.string()).min(1));
const flag = z.enum(["True", "False"]).transform(value => value === "True");
const contractorSchema = z.object({
  id: z.string().min(1), anon_name: z.string().min(1), categories: list,
  city: z.string().min(1), city_imputed: flag, synthetic: flag,
  price_from_kzt: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().nonnegative().safe()),
  price_imputed: flag, event_formats: list, languages: list,
  max_hours: z.string().transform(value => value === "" ? null : Number(value)).pipe(z.number().finite().positive().nullable()),
  busy_dates: z.string().transform(value => value.split("|").filter(Boolean)).pipe(z.array(dateSchema)),
  description: z.string().min(1),
});
export type Contractor = z.infer<typeof contractorSchema>;
export function normalizeContractor(row: unknown): Contractor { return contractorSchema.parse(row); }
