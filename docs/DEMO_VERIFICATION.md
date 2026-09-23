# Проверка перед freeze · 23.09.2026

Проверялось запущенное Next.js-приложение, реальные OpenAI Responses запросы и браузер. Модель из `.env.local`: `gpt-4.1-mini`. Ключ не изменялся и не включён в отчёт.

## Реальный AI и детерминизм

Запрос: Алматы, 2026-10-15, Ведущий, корпоратив, 1 500 000 ₸; язык и длительность не заданы. Пожелание: `Современный интеллигентный ведущий с импровизацией и юмором`.

| Запуск | HTTP | Полное время, мс | AI + валидация, мс | ID в порядке выдачи |
|---|---:|---:|---:|---|
| 1 | 200 | 4624 | 4586 | HK-44923, HK-77838, HK-35215 |
| 2 | 200 | 4602 | 4589 | HK-44923, HK-77838, HK-35215 |
| 3 | 200 | 4844 | 4819 | HK-44923, HK-77838, HK-35215 |
| 4 | 200 | 4487 | 4465 | HK-44923, HK-77838, HK-35215 |
| 5 | 200 | 4761 | 4740 | HK-44923, HK-77838, HK-35215 |
| После перезапуска | 200 | 4500 | 4332 | HK-44923, HK-77838, HK-35215 |

Во всех строках `aiUsed: true`, `aiStatus: used`, у всех трёх карточек `explanationSource: ai`. Схема, набор ID и точное присутствие evidence в описании прошли проверку; fallback не использован. Все строки относятся к окончательной версии с ограничением качественного контекста релевантными выдержками. После контрольного перезапуска порядок также совпал.

Полное время измерено клиентом до чтения HTTP-ответа, AI-время — на сервере вокруг вызова и проверки ответа. Это наблюдения, не гарантия будущей задержки. SDK/abort ограничены 7 секундами, без retries. В одной дополнительной серии до окончательной проверки наблюдался переход на fallback; порядок и HTTP 200 сохранились. Причина того единичного отклонения не была сохранена, поэтому она не приписывается конкретному сбою или таймауту. В финальной серии выше — 5/5 AI-ответов.

## Аудит объяснений

Первый запрос до исправления prompt превратил поддержку корпоративов в утверждение об опыте их проведения. Prompt уточнён: формат не доказывает опыт; требуются конкретная цена/бюджет, характеристика из описания, отсутствие выдуманных достижений и оговорка о неподтверждённых пожеланиях. При дополнительном просмотре профессия Хаула превратилась в «подготовку»: поэтому AI теперь получает только локальные релевантные выдержки, а при их отсутствии — первые две фразы описания. Нерелевантная биография больше не отправляется; это закреплено тестом SDK payload.

Сверены все три финалиста, включая пять повторов и ответ после перезапуска:

| Финалист | Структурированные основания | Качественные основания в CSV | Различимость без имени |
|---|---|---|---|
| Мицури, HK-44923 | От 650 000 ₸; корпоратив; русский; max 8 ч | «Импровизация, живой интеллигентный юмор»; «Современные интерактивы, креативные идеи» | Да: современные интерактивы и креативность |
| Хаул, HK-77838 | От 1 000 000 ₸; корпоратив; русский и казахский; max 8 ч | Интеллигентная ненавязчивая подача, культурная импровизация, тонкий юмор | Да: ненавязчивая культурная подача |
| Кики, HK-35215 | От 900 000 ₸; корпоратив; казахский, русский, английский; max 10 ч | «тонкого юмора, харизмы и безупречных манер»; импровизация в описании не заявлена | Да: манеры/харизма, три языка, явная оговорка об импровизации |

Цены, языки, форматы и упомянутые часы совпадают с полями CSV. Новых годов опыта, наград или способностей в проверенных финальных ответах не обнаружено. В финальных ответах после ограничения контекста профессии/подготовка Хаула больше не упоминаются. Описание — заявление профиля, не независимая проверка; наличие цитат не доказывает автоматически все формулировки свободного AI-текста.

## Реальный отказ сервиса

Обычный сервер временно остановлен. Тот же код запущен с процессными `OPENAI_API_KEY=local-failure-test` и `OPENAI_BASE_URL=http://127.0.0.1:9/v1`. Это реальный отказ соединения SDK, не заглушка функции. `.env.local` не менялся; действующий ключ не использовался при отказе.

Получено **HTTP 200**, 293 мс, `aiUsed: false`, `aiStatus: unavailable`, все три источника `fallback`. Порядок: HK-44923, HK-77838, HK-35215. В браузере видны три рабочие карточки, фактические объяснения и уведомление о недоступности AI. Затем временный сервер остановлен, нормальный сервер запущен без overrides; реальный AI снова успешно ответил (строка «После перезапуска»).

## Браузерные сценарии

- Dense: три карточки Мицури, Хаул, Кики; воронка 10 → 8 → 7 → 3; видна подпись «Пояснение OpenAI».
- Rare: Алматы, 15.10.2026, Флорист, свадьба, 300 000 ₸, 10 ч: Тони Тони Чоппер и Тихиро Огино, AI-пояснения; synthetic и восстановленная цена отмечены. `null max_hours` не исключает флористов.
- Zero: Алматы, 15.10.2026, Ведущий, корпоратив, 100 000 ₸: 0 карточек; 2 заняты, 1 не поддерживает формат, 7 выше бюджета. Воронка 10 → 8 → 7 → 0 → 0 → 0. Причины — первая неудачная проверка каждого профиля; сумма 10, без повторного учёта.
- Date change: все параметры Dense сохранены, дата 17.10.2026: HK-77838, HK-35215, HK-44733. HK-44923 исключён, поскольку новая дата явно присутствует в `busy_dates`. Закреплено тестом на исходном CSV.

## Небольшие изменения

- Явные отрицания `без`, `не` (включая `не нужен`, `не хочу`), `никаких`, `избегать` исключаются из положительного совпадения до границы фразы. Положительная часть после запятой сохраняется. Штрафов и NLP-догадок нет.
- 11 тестов отрицаний, регрессионный тест смены даты и тест реального SDK payload с заглушенным transport.
- Уточнение prompt и честного текста подсказки; измерение `meta.aiElapsedMs`.
- `scripts/verify-live.ts` — отдельная платная проверка, не входит в `npm test`.

Финальные проверки: **43/43 теста**, `npm run lint` и `npm run build` прошли. В 55 клиентских файлах dev/production и во всех отслеживаемых/новых исходниках значение ключа не обнаружено. `.env.local` игнорируется, отслеживается только `.env.example`. Исходный CSV не изменён. Обычный dev-сервер оставлен запущенным без тестовых overrides.
# Counterfactual decision support · 23.09.2026

The frozen recommendation pipeline was left intact. Counterfactual suggestions reuse `filterEligible` directly, simulate one condition at a time, retain IDs that became eligible, and never call OpenAI. A result with three cards gets no suggestions; category-not-found remains distinct and gets none. The API keeps the original result and adds `counterfactuals`; the UI renders a small secondary section only when suggestions exist.

Search rules: budget checks distinct catalog prices in ascending order; date checks days from nearest to farthest within ±14 days and the actual `busy_dates` calendar window, preferring the later date on ties; duration checks actual lower non-null `max_hours` values in descending order; language removes only the supplied requirement. Each dimension is independently minimal for its target (one eligible profile for zero results, three for one or two). The stable display order is budget, date, duration, language, capped at two; there is no combined cross-unit minimum.

## Verified real-catalog examples

**Zero result.** Request: Алматы, 2026-10-15, Ведущий, корпоратив, 100 000 ₸; no language or duration. Existing result: `NO_ELIGIBLE_CANDIDATES`, zero cards; 10 profiles in category/city, 2 busy, 1 format mismatch, 7 over budget. Minimal successful budget threshold: 650 000 ₸. Rerun yields 1 candidate, `HK-44923` (Мицури Канроджи). The baseline remains zero cards.

**Partial result.** Request: Астана, 2026-10-15, Фотограф, свадьба, 10 000 000 ₸; no optional constraints. Existing result: 2 cards (`HK-98562`, `HK-61323`). Moving the date to 2026-10-18 (3 days later) admits `HK-97737` and yields 3 eligible profiles. The suggestion is verified against `busy_dates` and the normal filter.

**Rare category.** The original florist demo remains at 2 cards (`HK-39372`, `HK-90001`). There are only two profiles in that city/category, so no single allowed relaxation reaches three; the system correctly returns no suggestion.

**Dense and date-change demos.** The original dense request remains ordered `HK-44923`, `HK-77838`, `HK-35215`; it has exactly 3 cards and `counterfactuals: []`. The existing date-change regression remains: 2026-10-15 returns those three IDs, while 2026-10-17 excludes busy `HK-44923` and returns `HK-77838`, `HK-35215`, `HK-44733`.

The checked-in `npm run demo` output includes the counterfactual metadata so the zero-result example is reproducible. Deterministic tests cover each threshold search and AI boundary/fallback tests continue to pass; no live OpenAI request was needed because the OpenAI integration was not changed.
