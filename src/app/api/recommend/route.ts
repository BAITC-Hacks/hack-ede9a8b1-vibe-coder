import { loadContractors } from "@/lib/data/loadContractors";
import { recommend } from "@/lib/recommendation/recommend";
import { recommendationSchema } from "@/lib/validation/recommendationSchema";

export const runtime = "nodejs";
export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "INVALID_INPUT", message: "Тело запроса должно быть JSON." }, { status: 400 }); }
  const parsed = recommendationSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "INVALID_INPUT", message: "Проверьте обязательные поля, дату, бюджет и длительность.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  try {
    return Response.json(recommend(loadContractors(), parsed.data));
  } catch {
    return Response.json({ error: "SERVER_ERROR", message: "Не удалось прочитать или обработать каталог. Проверьте data/contractors.csv на сервере." }, { status: 500 });
  }
}
