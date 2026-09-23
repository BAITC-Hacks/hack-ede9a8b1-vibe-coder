# Dataset coverage

This report compares the supplied catalog with its separately stored synthetic enrichment. Counts are contractor memberships in a category, so a profile with multiple categories appears in multiple cells. The supplied file remains the authoritative 66-row source.

## Before enrichment

`data/contractors.csv` contains **66 profiles**: 50 in Алматы, 15 in Астана, and 1 in Зарубежье. It has 13 rows already marked synthetic, 8 with an imputed city, and 18 with an imputed price. There are 66 unique IDs and 17 distinct categories.

### City × category

| Category | Алматы | Астана | Зарубежье |
|---|---:|---:|---:|
| Банкетный зал | 7 | 1 | 0 |
| Ведущий | 10 | 5 | 0 |
| Ведущий церемонии | 2 | 1 | 0 |
| Видеограф | 2 | 2 | 0 |
| Декоратор | 3 | 0 | 0 |
| Загородная площадка | 4 | 0 | 0 |
| Инструменталист | 3 | 0 | 0 |
| Лайв-бэнд | 5 | 0 | 0 |
| Национальный ансамбль | 4 | 0 | 0 |
| Отель | 2 | 1 | 0 |
| Подарки и сувениры | 2 | 1 | 0 |
| Ресторан | 7 | 0 | 0 |
| Танцевальный коллектив | 4 | 0 | 0 |
| Флорист | 2 | 1 | 0 |
| Фото и видеобудки | 2 | 1 | 0 |
| Фотограф | 8 | 3 | 1 |
| Шоу-программа | 5 | 0 | 0 |

Astana had zero profiles for Декоратор, Инструменталист, Лайв-бэнд, Национальный ансамбль, Ресторан, Танцевальный коллектив, Загородная площадка, and Шоу-программа. The named rare categories were especially sparse: Astana had zero or one each; Almaty had two or three.

### Prices by category, all cities

Values are `min / median / max` in KZT, using category membership (not city-specific where a category has too few Astana rows to form a useful distribution).

| Category | Profiles | Min | Median | Max |
|---|---:|---:|---:|---:|
| Банкетный зал | 8 | 2,000,000 | 3,100,000 | 6,000,000 |
| Ведущий | 15 | 500,000 | 900,000 | 2,000,000 |
| Ведущий церемонии | 3 | 200,000 | 220,000 | 250,000 |
| Видеограф | 4 | 300,000 | 450,000 | 800,000 |
| Декоратор | 3 | 1,800,000 | 2,000,000 | 2,200,000 |
| Загородная площадка | 4 | 2,500,000 | 3,250,000 | 4,000,000 |
| Инструменталист | 3 | 350,000 | 400,000 | 500,000 |
| Лайв-бэнд | 5 | 800,000 | 1,150,000 | 1,500,000 |
| Национальный ансамбль | 4 | 400,000 | 500,000 | 500,000 |
| Отель | 3 | 2,800,000 | 3,200,000 | 6,000,000 |
| Подарки и сувениры | 3 | 100,000 | 120,000 | 150,000 |
| Ресторан | 7 | 2,000,000 | 3,200,000 | 6,000,000 |
| Танцевальный коллектив | 4 | 400,000 | 500,000 | 500,000 |
| Флорист | 3 | 200,000 | 250,000 | 300,000 |
| Фото и видеобудки | 3 | 280,000 | 300,000 | 450,000 |
| Фотограф | 12 | 150,000 | 275,000 | 600,000 |
| Шоу-программа | 5 | 400,000 | 500,000 | 500,000 |

### Other fields and calendar

- Existing event-format memberships: свадьба 55, корпоратив 46, конференция 18, юбилей 40, день рождения 12, той 22.
- Existing language memberships: русский 62, казахский 24, английский 24. Profiles can support multiple values.
- `max_hours` is null for 9 profiles; observed non-null limits are 2, 3, 4, 5, 6, 8, 10, and 12 hours. Null is retained for off-site categories where presence duration does not apply.
- Busy-date rates use only days in the supplied window (23–30 September, then full calendar months): September 41.3%, October 38.6%, November 40.6%, December 74.6%. These match the brief’s seasonal guidance.

## After enrichment

`data/contractors.synthetic.csv` adds **24 rows** with IDs `SYN-10001`–`SYN-10024`. The combined catalog has **90 profiles**: 50 in Алматы, 39 in Астана, and 1 in Зарубежье. Thirty-seven rows are marked synthetic overall: 13 already flagged in the supplied source and 24 new rows. The original file remains 66 rows and retains SHA-256 `6a724b6b7dfb5973343e68ba18dadb60fc807d87e3d78f03ee86fb26cb089f7d`.

### City × category after

| Category | Алматы | Астана | Зарубежье |
|---|---:|---:|---:|
| Банкетный зал | 7 | 3 | 0 |
| Ведущий | 10 | 5 | 0 |
| Ведущий церемонии | 2 | 3 | 0 |
| Видеограф | 2 | 4 | 0 |
| Декоратор | 3 | 3 | 0 |
| Загородная площадка | 4 | 0 | 0 |
| Инструменталист | 3 | 3 | 0 |
| Лайв-бэнд | 5 | 2 | 0 |
| Национальный ансамбль | 4 | 0 | 0 |
| Отель | 2 | 3 | 0 |
| Подарки и сувениры | 2 | 3 | 0 |
| Ресторан | 7 | 2 | 0 |
| Танцевальный коллектив | 4 | 0 | 0 |
| Флорист | 2 | 3 | 0 |
| Фото и видеобудки | 2 | 3 | 0 |
| Фотограф | 8 | 3 | 1 |
| Шоу-программа | 5 | 0 | 0 |

New profiles by category (all in Астана): Флорист 2, Декоратор 3, Подарки и сувениры 2, Ведущий церемонии 2, Фото и видеобудки 2, Отель 2, Банкетный зал 2, Ресторан 2, Инструменталист 3, Видеограф 2, and Лайв-бэнд 2. This brings the named rare Astana categories to 3 profiles each. The additions also broaden venue and video coverage, while categories such as Загородная площадка, Национальный ансамбль, Танцевальный коллектив, and Шоу-программа remain absent in Astana.

### Price and field changes

The category price ranges stay within or close to the source distribution. Changed `min / median / max` values in KZT are:

| Category | Profiles after | Min | Median | Max |
|---|---:|---:|---:|---:|
| Банкетный зал | 10 | 2,000,000 | 3,100,000 | 6,000,000 |
| Ведущий церемонии | 5 | 200,000 | 220,000 | 250,000 |
| Видеограф | 6 | 300,000 | 450,000 | 800,000 |
| Декоратор | 6 | 1,800,000 | 2,050,000 | 2,300,000 |
| Инструменталист | 6 | 350,000 | 415,000 | 520,000 |
| Лайв-бэнд | 7 | 800,000 | 1,150,000 | 1,500,000 |
| Отель | 5 | 2,800,000 | 3,400,000 | 6,000,000 |
| Подарки и сувениры | 5 | 100,000 | 120,000 | 150,000 |
| Ресторан | 9 | 2,000,000 | 3,200,000 | 6,000,000 |
| Флорист | 5 | 200,000 | 250,000 | 300,000 |
| Фото и видеобудки | 5 | 280,000 | 320,000 | 450,000 |

The new rows use only existing event formats and languages. The combined catalog now has 70 wedding, 58 corporate, 27 conference, 50 anniversary, 16 birthday, and 29 toy format memberships; language memberships are Russian 86, Kazakh 35, and English 32. `max_hours` is null for 16 profiles, retaining the off-site behavior for florists, decorators, and gift suppliers. Existing imputation flags remain unchanged (8 cities and 18 prices imputed); every new profile has both flags false.

The generator uses fixed seed `0x0a1e2026` with a small Mulberry32 PRNG. It selects unique dates and sorts them in the supported window. Per synthetic profile, the generated busy-date counts are 3–4 of 8 remaining September days, 10–15 of 31 October days, 9–15 of 30 November days, and 22–24 of 31 December days. Merged-catalog busy rates are September 41.8%, October 38.5%, November 40.6%, and December 74.5%.

### Demo impact and mixed-source example

The original demo scenarios still use the supplied catalog’s combinations and remain valid on the merged catalog:

- Dense Almaty hosts, 15 October: `HK-44923`, `HK-29829`, `HK-77838`.
- Rare Almaty florist: `HK-39372`, `HK-90001` (two honest results).
- Zero-result Almaty host at 100,000 ₸: still zero cards; verified budget relaxation remains 650,000 ₸.
- Date sensitivity: 15 October returns `HK-44923`, `HK-29829`, `HK-77838`; 17 October excludes the busy `HK-44923` and returns `HK-77838`, `HK-35215`, `HK-44733`.
- Astana photographer partial/counterfactual case remains two cards; changing to 18 October admits `HK-97737` and reaches three.

A separate ordinary query demonstrates the visible synthetic marker without altering the recommendation rules: **Астана, 25 September 2026, Видеограф, свадьба, 700,000 ₸**. Four profiles exist in the city/category; two are available and eligible. The shortlist is `SYN-10021` Кира Невис (synthetic, 350,000 ₸) and `HK-10990` Тодороки Шото (supplied, 400,000 ₸). The existing card displays “Синтетический профиль” for the first and no synthetic badge for the second.

The checked-in synthetic CSV exactly matches the deterministic generator output. Tests verify the 66-row source checksum, all 24 generated rows, unique IDs, schema/enum/date/rate constraints, a 90-profile merged catalog, preserved demo outcomes, and the mixed-source example.
