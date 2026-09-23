import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "csv-parse/sync";
import { normalizeContractor } from "../src/lib/data/normalizeContractor";

const ORIGINAL_PATH = resolve(process.cwd(), "data/contractors.csv");
const OUTPUT_PATH = resolve(process.cwd(), "data/contractors.synthetic.csv");
export const SYNTHETIC_PROFILE_COUNT = 24;
export const SYNTHETIC_SEED = 0x0a1e2026;

const ALLOWED_FORMATS = new Set(["свадьба", "той", "корпоратив", "конференция", "юбилей", "день рождения"]);
const ALLOWED_LANGUAGES = new Set(["русский", "казахский", "английский"]);
const MONTHS = [
  { key: "2026-09", first: 23, last: 30, minBusy: 3, maxBusy: 4 },
  { key: "2026-10", first: 1, last: 31, minBusy: 10, maxBusy: 15 },
  { key: "2026-11", first: 1, last: 30, minBusy: 9, maxBusy: 15 },
  { key: "2026-12", first: 1, last: 31, minBusy: 22, maxBusy: 24 },
] as const;

interface ProfileDefinition {
  anon_name: string;
  categories: string[];
  city: "Алматы" | "Астана";
  price_from_kzt: number;
  event_formats: string[];
  languages: string[];
  max_hours: number | null;
  description: string;
}

const DEFINITIONS: ProfileDefinition[] = [
  { anon_name: "Ая Мирай", categories: ["Флорист"], city: "Астана", price_from_kzt: 225_000, event_formats: ["свадьба", "той"], languages: ["казахский", "русский"], max_hours: null, description: "Собирает сезонные букеты и камерные композиции для свадебных церемоний и тоев. В оформлении сочетает местные цветы, спокойные палитры и натуральные фактуры." },
  { anon_name: "Лиана Сайра", categories: ["Флорист"], city: "Астана", price_from_kzt: 275_000, event_formats: ["свадьба", "корпоратив", "юбилей"], languages: ["русский"], max_hours: null, description: "Создаёт цветочные композиции для семейных праздников и корпоративных встреч. Предпочитает сезонные растения, графичные формы и сдержанные цветовые сочетания." },
  { anon_name: "Элина Равель", categories: ["Декоратор"], city: "Астана", price_from_kzt: 1_800_000, event_formats: ["свадьба", "корпоратив"], languages: ["русский"], max_hours: null, description: "Проектирует минималистичные свадебные и корпоративные декорации с акцентом на свет и геометрию. Готовит эскиз, подбирает материалы и организует монтаж площадки." },
  { anon_name: "Кайрат Вейл", categories: ["Декоратор"], city: "Астана", price_from_kzt: 2_100_000, event_formats: ["свадьба", "той", "юбилей"], languages: ["казахский", "русский"], max_hours: null, description: "Оформляет свадьбы, тои и юбилеи с национальными орнаментами и текстильными деталями. Для каждого события собирает отдельную палитру и план расстановки декора." },
  { anon_name: "Дина Арбор", categories: ["Декоратор"], city: "Астана", price_from_kzt: 2_300_000, event_formats: ["корпоратив", "конференция"], languages: ["русский", "английский"], max_hours: null, description: "Специализируется на деловом оформлении конференций и корпоративных площадок. Использует модульные конструкции, навигационные элементы и спокойные брендовые цвета." },
  { anon_name: "Мира Лиан", categories: ["Подарки и сувениры"], city: "Астана", price_from_kzt: 110_000, event_formats: ["корпоратив", "конференция"], languages: ["русский", "английский"], max_hours: null, description: "Собирает компактные welcome-наборы и брендированные блокноты для конференций и корпоративных встреч. Макеты согласуются до печати, а минимальный тираж зависит от состава набора." },
  { anon_name: "Сая Нор", categories: ["Подарки и сувениры"], city: "Астана", price_from_kzt: 145_000, event_formats: ["свадьба", "день рождения", "юбилей"], languages: ["казахский", "русский"], max_hours: null, description: "Готовит персональные карточки, небольшие подарки гостям и упаковку для семейных торжеств. В оформлении использует имена и цветовую тему события, без готовых универсальных наборов." },
  { anon_name: "Алия Луме", categories: ["Ведущий церемонии"], city: "Астана", price_from_kzt: 200_000, event_formats: ["свадьба"], languages: ["казахский", "русский"], max_hours: 3, description: "Проводит камерные свадебные церемонии на казахском и русском языках. Сценарий строит вокруг историй пары, с короткими репликами и спокойным темпом." },
  { anon_name: "Раян Тэм", categories: ["Ведущий церемонии"], city: "Астана", price_from_kzt: 250_000, event_formats: ["свадьба", "той"], languages: ["русский"], max_hours: 3, description: "Ведёт выездные регистрации и свадебные церемонии с заранее согласованным сценарием. Предпочитает лаконичную подачу и небольшое число обращений к гостям." },
  { anon_name: "Нико Эйр", categories: ["Фото и видеобудки"], city: "Астана", price_from_kzt: 320_000, event_formats: ["свадьба", "корпоратив", "день рождения"], languages: ["русский"], max_hours: 6, description: "Привозит фотобудку с моментальной печатью и сменными рамками для снимков. Подходит для свадеб, корпоративов и дней рождения; оформление макета согласуется с заказчиком." },
  { anon_name: "Дана Вель", categories: ["Фото и видеобудки"], city: "Астана", price_from_kzt: 410_000, event_formats: ["корпоратив", "конференция", "юбилей"], languages: ["казахский", "русский"], max_hours: 6, description: "Устанавливает интерактивную фотостойку для корпоративных встреч и конференций. Гости получают цифровую копию снимка, а печатная рамка может содержать согласованную символику события." },
  { anon_name: "Эстель Лиор", categories: ["Отель"], city: "Астана", price_from_kzt: 3_400_000, event_formats: ["конференция", "корпоратив"], languages: ["русский", "английский"], max_hours: 10, description: "Деловой отель предлагает зал для конференций и корпоративных встреч с экраном, звуковым оборудованием и зонами регистрации. Для приглашённых доступны гостиничные номера и отдельная зона кофе-брейка." },
  { anon_name: "Марк Аскар", categories: ["Отель"], city: "Астана", price_from_kzt: 4_800_000, event_formats: ["свадьба", "юбилей", "той"], languages: ["казахский", "русский"], max_hours: 8, description: "Отельная площадка принимает свадьбы, тои и юбилеи в банкетном зале с отдельной зоной для семейного ужина. План рассадки, меню и доступ к номерам согласуются с организаторами заранее." },
  { anon_name: "Айлин Терен", categories: ["Банкетный зал"], city: "Астана", price_from_kzt: 2_500_000, event_formats: ["свадьба", "той", "юбилей"], languages: ["казахский", "русский"], max_hours: 8, description: "Банкетный зал рассчитан на семейные торжества и традиционные тои. Пространство можно разделить на зоны для ужина и танцев, а меню включает несколько вариантов национальной кухни." },
  { anon_name: "Лев Арден", categories: ["Банкетный зал"], city: "Астана", price_from_kzt: 4_000_000, event_formats: ["корпоратив", "конференция"], languages: ["русский", "английский"], max_hours: 10, description: "Зал подходит для корпоративных встреч и конференций с экраном, сценой и базовым звуковым оборудованием. Планировка допускает рассадку рядами или отдельными столами для приёма гостей." },
  { anon_name: "Нура Лейм", categories: ["Ресторан"], city: "Астана", price_from_kzt: 2_400_000, event_formats: ["свадьба", "юбилей", "день рождения"], languages: ["казахский", "русский"], max_hours: 8, description: "Ресторан принимает семейные праздники в зале с отдельной детской зоной и меню казахской кухни. Для небольших компаний доступна рассадка за круглыми столами." },
  { anon_name: "Сарен Ори", categories: ["Ресторан"], city: "Астана", price_from_kzt: 3_900_000, event_formats: ["корпоратив", "конференция"], languages: ["русский", "английский"], max_hours: 6, description: "Ресторанный зал рассчитан на корпоративные ужины и деловые встречи с презентационной зоной. В меню есть европейские блюда и отдельный формат кофе-брейка для участников конференций." },
  { anon_name: "Матео Ирс", categories: ["Инструменталист"], city: "Астана", price_from_kzt: 350_000, event_formats: ["свадьба", "той"], languages: ["казахский", "русский"], max_hours: 2, description: "Исполняет сольные партии на скрипке во время свадебной церемонии и welcome-зоны тоя. Репертуар сочетает классические мелодии и современные инструментальные обработки." },
  { anon_name: "Жанна Эстэр", categories: ["Инструменталист"], city: "Астана", price_from_kzt: 430_000, event_formats: ["корпоратив", "юбилей"], languages: ["русский", "английский"], max_hours: 3, description: "Играет на саксофоне на корпоративных приёмах и юбилеях. Программа состоит из джазовых стандартов и спокойных фоновых композиций для ужина." },
  { anon_name: "Илья Верен", categories: ["Инструменталист"], city: "Астана", price_from_kzt: 520_000, event_formats: ["конференция", "свадьба"], languages: ["русский"], max_hours: 2, description: "Предлагает короткие инструментальные выступления на виолончели для открытия конференции или свадебной церемонии. Заранее согласует продолжительность с организатором и использует компактное звуковое оборудование." },
  { anon_name: "Кира Невис", categories: ["Видеограф"], city: "Астана", price_from_kzt: 350_000, event_formats: ["свадьба", "юбилей"], languages: ["русский"], max_hours: 8, description: "Снимает свадебные церемонии и семейные юбилеи в документальном стиле. В готовом ролике уделяет внимание естественным репликам, деталям оформления и последовательности событий." },
  { anon_name: "Саян Лор", categories: ["Видеограф"], city: "Астана", price_from_kzt: 650_000, event_formats: ["корпоратив", "конференция", "день рождения"], languages: ["казахский", "русский", "английский"], max_hours: 10, description: "Создаёт репортажные ролики для конференций, корпоративных встреч и дней рождения. Может подготовить короткую версию для презентации и отдельный монтаж с выступлениями и интервью гостей." },
  { anon_name: "Мирак Дэн", categories: ["Лайв-бэнд"], city: "Астана", price_from_kzt: 900_000, event_formats: ["свадьба", "той", "юбилей"], languages: ["казахский", "русский"], max_hours: 4, description: "Акустический состав играет на свадьбах, тоях и юбилеях. В программе есть казахские народные мелодии и популярные песни в камерных аранжировках." },
  { anon_name: "Эль Риан", categories: ["Лайв-бэнд"], city: "Астана", price_from_kzt: 1_400_000, event_formats: ["корпоратив", "конференция"], languages: ["русский", "английский"], max_hours: 3, description: "Группа исполняет музыку для корпоративных вечеров и конференций с вечерней программой. Репертуар включает поп- и джазовые каверы, громкость и длительность сетов согласуются с площадкой." },
];

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function shuffle<T>(values: T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function makeBusyDates(random: () => number): string[] {
  return MONTHS.flatMap(month => {
    const dates = Array.from({ length: month.last - month.first + 1 }, (_, index) => `${month.key}-${String(month.first + index).padStart(2, "0")}`);
    const count = month.minBusy + Math.floor(random() * (month.maxBusy - month.minBusy + 1));
    return shuffle(dates, random).slice(0, count);
  }).sort();
}

function serialize(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function generateSyntheticRows(seed = SYNTHETIC_SEED): Record<string, string>[] {
  if (DEFINITIONS.length !== SYNTHETIC_PROFILE_COUNT) throw new Error(`Expected ${SYNTHETIC_PROFILE_COUNT} synthetic profiles, got ${DEFINITIONS.length}`);
  const random = mulberry32(seed);
  const rows = DEFINITIONS.map((definition, index) => ({
    id: `SYN-${String(10_001 + index).padStart(5, "0")}`,
    anon_name: definition.anon_name,
    categories: definition.categories.join("|"),
    city: definition.city,
    city_imputed: "False",
    synthetic: "True",
    price_from_kzt: String(definition.price_from_kzt),
    price_imputed: "False",
    event_formats: definition.event_formats.join("|"),
    languages: definition.languages.join("|"),
    max_hours: definition.max_hours === null ? "" : String(definition.max_hours),
    busy_dates: makeBusyDates(random).join("|"),
    description: definition.description,
  }));
  return rows;
}

export function buildSyntheticCsv(originalCsv: string, seed = SYNTHETIC_SEED): string {
  const originalRows: Record<string, string>[] = parse(originalCsv, { columns: true, bom: true, skip_empty_lines: true });
  if (originalRows.length !== 66) throw new Error(`Expected 66 supplied profiles, got ${originalRows.length}`);
  const headers = Object.keys(originalRows[0] ?? {});
  const requiredHeaders = ["id", "anon_name", "categories", "city", "city_imputed", "synthetic", "price_from_kzt", "price_imputed", "event_formats", "languages", "max_hours", "busy_dates", "description"];
  if (headers.length !== requiredHeaders.length || requiredHeaders.some((header, index) => headers[index] !== header)) throw new Error("Supplied CSV schema or column order changed");
  const originalIds = new Set(originalRows.map(row => row.id));
  if (originalIds.size !== originalRows.length) throw new Error("Supplied CSV contains duplicate IDs");
  const knownCategories = new Set(originalRows.flatMap(row => row.categories.split("|")));
  const rows = generateSyntheticRows(seed);
  const syntheticIds = new Set<string>();
  for (const row of rows) {
    if (originalIds.has(row.id) || syntheticIds.has(row.id)) throw new Error(`Duplicate profile ID: ${row.id}`);
    syntheticIds.add(row.id);
    const normalized = normalizeContractor(row);
    if (normalized.synthetic !== true || normalized.city_imputed || normalized.price_imputed) throw new Error(`Invalid synthetic flags: ${row.id}`);
    if (!new Set(["Алматы", "Астана"]).has(normalized.city)) throw new Error(`Unsupported city: ${row.city}`);
    if (normalized.categories.some(category => !knownCategories.has(category))) throw new Error(`Unknown category: ${row.id}`);
    if (normalized.event_formats.some(format => !ALLOWED_FORMATS.has(format))) throw new Error(`Unsupported event format: ${row.id}`);
    if (normalized.languages.some(language => !ALLOWED_LANGUAGES.has(language))) throw new Error(`Unsupported language: ${row.id}`);
    if (normalized.price_from_kzt <= 0 || (normalized.max_hours !== null && (normalized.max_hours < 2 || normalized.max_hours > 12))) throw new Error(`Invalid price or duration: ${row.id}`);
    if (normalized.description.trim().length === 0 || new Set(normalized.busy_dates).size !== normalized.busy_dates.length) throw new Error(`Invalid description or duplicate busy date: ${row.id}`);
    if (normalized.busy_dates.some(date => date < "2026-09-23" || date > "2026-12-31")) throw new Error(`Busy date outside the catalog window: ${row.id}`);
  }
  return `${headers.join(",")}\n${rows.map(row => headers.map(header => serialize(row[header])).join(",")).join("\n")}\n`;
}

export function writeSyntheticCsv(originalCsv = readFileSync(ORIGINAL_PATH, "utf8"), outputPath = OUTPUT_PATH, seed = SYNTHETIC_SEED): string {
  const csv = buildSyntheticCsv(originalCsv, seed);
  writeFileSync(outputPath, csv, "utf8");
  return csv;
}

if (process.argv[1]?.endsWith("generate-synthetic-profiles.ts")) {
  writeSyntheticCsv();
  console.log(`Wrote ${SYNTHETIC_PROFILE_COUNT} deterministic profiles to ${OUTPUT_PATH}`);
}
