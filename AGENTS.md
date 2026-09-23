# HackAlem 2026 — Engineering Rules

You are implementing a submission for a 5-hour AI hackathon.

The objective is NOT to build the largest or most sophisticated product.

The objective is to build the smallest reliable system that:

1. solves the stated contractor-selection problem correctly,
2. produces strong, evidence-based explanations,
3. behaves deterministically,
4. handles edge cases honestly,
5. works reliably in a live demo,
6. is easy for judges to understand and reproduce.

Time, reliability, and task fit are more important than architectural elegance.

---

# 1. Core Product Principle

The product helps a user select up to 3 event contractors from an existing catalog.

The catalog already exists.

We are NOT building contractor discovery.

We are building a decision and explanation layer.

Core flow:

```text
User requirements
↓
Deterministic eligibility filtering
↓
Eligible contractors
↓
Deterministic ranking
↓
Semantic / qualitative analysis where useful
↓
Top ≤ 3 contractors
↓
Evidence-grounded explanations
```

The key product principle is:

> The value is in explaining WHY a contractor fits, not merely sorting contractors.

---

# 2. Hard Architecture Rule

Never let an LLM decide deterministic facts.

Application code must determine:

* category match
* city match
* availability for selected date
* event-format compatibility
* budget compatibility
* requested language compatibility
* duration compatibility
* result count
* deterministic ranking order

The LLM may be used for:

* understanding qualitative preferences
* analyzing contractor descriptions
* extracting semantic evidence
* generating concise explanations grounded in supplied facts

Rule:

> Code establishes truth. AI interprets qualitative information and explains it.

Do not move deterministic business logic into prompts.

---

# 3. No Fake Agentic AI

Do not introduce autonomous loops, multiple agents, planners, supervisors, critics, or agent frameworks unless they materially improve the required workflow.

Prefer:

```text
one recommendation pipeline
+
small focused AI calls
+
well-defined functions
```

over:

```text
planner agent
→ search agent
→ ranking agent
→ critic agent
→ writer agent
```

Do not call ordinary prompt chaining "multi-agent architecture".

Agentic behavior, if present, must correspond to real decisions or tool/function execution.

---

# 4. Determinism Is Mandatory

The same request must return contractors in the same order.

Never allow generated text to influence ranking.

Ranking must be calculated before explanation generation.

Use a deterministic tie-break strategy.

Preferred pattern:

```text
score DESC
price ASC
id ASC
```

or another documented stable ordering.

Avoid randomness.

Do not rely on arbitrary array/object iteration order where it affects ranking.

AI wording may vary slightly, but contractor ordering must not.

---

# 5. Eligibility Before Ranking

Never score contractors that should have been rejected first.

Suggested pipeline:

```text
all profiles
↓
category + city
↓
date availability
↓
event format
↓
budget
↓
optional language
↓
optional duration
↓
eligible candidates
↓
ranking
```

A contractor busy on the requested date must never appear in recommendations.

If a requested requirement is intended as a hard constraint, enforce it before ranking.

---

# 6. Explicit Result States

The backend and frontend must distinguish these states clearly.

## SUCCESS

Eligible contractors exist.

Return up to 3.

## CATEGORY_NOT_FOUND

There are no contractors of the requested category in the selected city.

Do not pretend this is the same as filtering failure.

## NO_ELIGIBLE_CANDIDATES

Contractors exist for that category/city, but all were rejected by constraints.

Return structured reasons for rejection where possible.

Example:

```text
3 candidates existed:
- 2 unavailable on selected date
- 1 above budget
```

## PARTIAL_RESULT

Only 1 or 2 contractors pass.

Return them.

Explain why fewer than 3 are available.

Never pad results.

Never hallucinate additional contractors.

---

# 7. Recommendation Explanations

Explanations are a primary feature, not decoration.

Each explanation must contain evidence specific to that contractor.

Good:

```text
Works in Kazakh and Russian, supports weddings for up to 10 hours,
and the profile specifically emphasizes improvisation and subtle humor.
```

Bad:

```text
A great choice for your event with lots of experience.
```

Do not generate interchangeable praise.

Explanations should reference relevant evidence such as:

* price vs budget
* supported event format
* language
* duration
* qualitative characteristics from description
* user-provided natural-language preferences

Never invent attributes not present in the profile.

Never infer factual achievements or capabilities unsupported by data.

---

# 8. Evidence First

Internally represent WHY a contractor ranked highly.

Prefer structured evidence:

```ts
{
  contractorId: "...",
  hardMatches: {
    city: true,
    available: true,
    format: true,
    budget: true,
    language: true,
    duration: true
  },
  semanticEvidence: [
    "mentions improvisation",
    "describes modern hosting style"
  ],
  score: 0.87
}
```

Generate explanations FROM structured evidence.

Do not ask the model to invent the explanation from the raw dataset without constraints.

---

# 9. AI Calls

Use OpenAI only where it adds value.

Prefer:

* structured outputs
* strict schemas
* focused prompts
* small candidate sets
* predictable input
* explicit evidence fields

Avoid:

```text
Here are all 66 profiles. Pick the best three.
```

Do not send the entire dataset to an LLM unless there is a compelling technical reason.

Prefer deterministic filtering first so AI sees only a small candidate set.

Do not use one giant prompt for filtering + ranking + reasoning + explanation.

---

# 10. Semantic Matching

If qualitative user preferences are supported, examples include:

```text
"современный двуязычный ведущий с импровизацией"
```

Use semantic analysis only after deterministic eligibility filtering.

Semantic relevance may influence ranking between already valid candidates.

Semantic relevance must never override hard constraints.

A semantically excellent but unavailable contractor is still unavailable.

---

# 11. Ranking

Keep scoring transparent and understandable.

Do not build an unnecessarily complex ML ranking system.

For this small dataset, simple deterministic scoring is preferred.

Potential signals:

* budget fit / price headroom
* optional preference match
* semantic description relevance
* language if treated as preference rather than requirement
* duration if treated as preference rather than requirement

Document weights and behavior.

Avoid unexplained magic numbers.

Stable tie-breaking is mandatory.

---

# 12. Data Handling

The supplied dataset is small.

Keep data handling simple.

Prefer:

```text
CSV / JSON
→ parse
→ normalize
→ keep in memory
```

Do NOT add:

* PostgreSQL
* Supabase
* Redis
* Elasticsearch
* Pinecone
* vector database

unless absolutely required.

For 66 profiles, infrastructure complexity is a liability.

Do not modify source data silently.

Preserve fields such as:

* synthetic
* city_imputed
* price_imputed

If shown in the UI, clearly distinguish synthetic profiles where relevant.

---

# 13. UI Scope

The UI exists to demonstrate the recommendation system.

Keep it simple.

Primary interface:

```text
Input form
↓
Recommendation activity / filtering summary
↓
Up to 3 recommendation cards
```

Useful input fields:

* city
* date
* event type
* contractor category
* budget
* optional duration
* optional language
* optional qualitative preference

Recommendation card should prioritize:

* contractor name
* category
* city
* price
* clear evidence
* explanation

Do not spend significant time on visual polish before the full workflow works.

---

# 14. Make the Pipeline Visible

Where helpful, expose a concise trace such as:

```text
15 candidates found
↓
9 available
↓
5 pass requirements
↓
3 strongest matches selected
```

Or:

```text
✓ Category matched
✓ Availability checked
✓ Budget checked
✓ Event format checked
✓ Preferences analyzed
✓ Recommendations ranked
```

Only display steps that actually happened.

Never fake an AI activity timeline.

---

# 15. Explicit Non-Goals

Do NOT implement unless directly required:

* authentication
* registration
* user profiles
* contractor accounts
* booking
* payments
* messaging
* notifications
* favorites
* admin panel
* maps
* analytics dashboard
* mobile app
* complex databases
* multi-agent frameworks
* model fine-tuning
* synthetic profile generation
* vendor onboarding
* elaborate animations
* unnecessary infrastructure

If considering an extra feature, ask:

> Will this materially improve judging of the required workflow?

If not, do not build it.

---

# 16. Reliability

Assume external services may fail.

OpenAI integration must:

* use environment variables
* never expose API keys client-side
* use reasonable timeout handling
* handle malformed model output
* use schema validation
* avoid unlimited retries
* provide useful user-facing errors

Do not retry expensive calls endlessly.

One controlled retry is acceptable when justified.

The deterministic filtering/ranking system should continue to function even if explanation generation fails.

Prefer graceful degradation such as:

```text
recommendations available
+
structured evidence displayed
+
AI explanation unavailable
```

over total request failure.

---

# 17. Performance

Target normal recommendation response time under 10 seconds.

Avoid sequential AI calls per contractor where one structured request can safely process all finalists.

Example:

Bad:

```text
candidate 1 → LLM
candidate 2 → LLM
candidate 3 → LLM
```

Better:

```text
top candidates → one structured explanation request
```

unless individual calls have a strong reliability advantage.

---

# 18. Validation

Validate all external/model-generated data.

Use schemas.

Model output should never be trusted directly.

If using TypeScript, prefer a runtime validator such as Zod for structured model responses when appropriate.

Do not rely on parsing arbitrary prose.

---

# 19. Tests

Prioritize tests around business rules, not UI snapshots.

Must cover at minimum:

1. busy contractor is excluded
2. wrong city is excluded
3. unsupported event format is excluded
4. contractor above budget is excluded
5. optional language requirement works
6. optional duration requirement works
7. same request returns same order
8. category-not-found state
9. no-eligible-candidates state
10. fewer than 3 candidates state
11. maximum 3 recommendations
12. stable tie-breaking

If semantic/AI behavior is hard to test deterministically, test the boundary around it.

Core eligibility logic must not depend on live API tests.

---

# 20. Demo Cases

Maintain at least three reliable demo scenarios:

## Dense category

Example category such as:

* Ведущий
* Фотограф
* Банкетный зал

Must demonstrate real ranking between multiple eligible candidates.

## Rare category

Use a category with very few candidates.

Must demonstrate honest partial results.

## No result

Use a request that produces zero eligible candidates.

Must explain WHY.

Do not wait until the final minutes to discover whether these scenarios work.

---

# 21. README

README is part of the submission, not cleanup.

It must eventually explain:

* problem
* solution
* architecture
* why deterministic logic and AI are separated
* project structure
* setup
* environment variables
* run command
* test command
* recommendation pipeline
* ranking approach
* OpenAI usage
* known limitations
* demo scenarios

A judge should be able to understand and run the project from the README.

---

# 22. Code Quality

Prefer obvious code over clever abstractions.

Use small modules with clear responsibilities.

Likely conceptual boundaries:

```text
data loader
normalizer
eligibility filter
ranking engine
semantic analysis
explanation generator
API endpoint
UI
```

Do not create abstractions for hypothetical future requirements.

Do not refactor working code without a concrete reason during the hackathon.

---

# 23. External Integrations

Keep external integrations isolated behind small interfaces.

Example:

```ts
interface ExplanationService {
  generate(input: ExplanationInput): Promise<ExplanationResult>;
}
```

This allows deterministic business logic to remain independent of OpenAI.

Never scatter OpenAI SDK calls throughout the application.

---

# 24. Environment Variables

Never hard-code secrets.

Use:

```text
OPENAI_API_KEY=
```

Provide `.env.example`.

Never commit `.env`.

Ensure `.gitignore` protects secrets.

---

# 25. Error Handling

Errors must be actionable.

Bad:

```text
Something went wrong
```

Better:

```text
Recommendations were calculated, but AI explanations could not be generated.
Please retry explanation generation.
```

Distinguish:

* invalid input
* no candidates
* no eligible candidates
* model failure
* server failure

Do not represent normal empty-result states as exceptions.

---

# 26. Git / Implementation Discipline

Prefer working vertical slices.

Recommended checkpoints:

```text
1. scaffold
2. dataset parses
3. deterministic filtering works
4. ranking works
5. tests pass
6. API works
7. OpenAI explanation works
8. UI works end-to-end
9. demo scenarios verified
10. README + freeze
```

Commit working states when practical.

Do not leave the core recommendation workflow untested while building polish.

---

# 27. Time Discipline

When deciding between:

```text
A. elegant solution taking ~45 minutes
B. simple reliable solution taking ~10 minutes
```

choose B unless A materially improves the judging outcome.

Once the golden path works:

STOP ADDING FEATURES.

Spend remaining time on:

* correctness
* reliability
* tests
* explanation quality
* demo flow
* README
* deployment
* visual clarity

---

# 28. Before Making a Significant Change

Ask:

1. Does this improve task correctness?
2. Does this improve explanation quality?
3. Does this improve live-demo reliability?
4. Does this improve reproducibility?
5. Does this materially improve judging?

If the answer to all five is no:

Do not implement it.

---

# 29. Priority Order

When trade-offs occur, use this order:

```text
1. Correctness
2. Explanation quality
3. Honest edge-case handling
4. Determinism
5. Reliability
6. Reproducibility
7. Speed
8. Demo clarity
9. UI polish
10. Extra features
```

---

# 30. Final Principle

Never optimize for showing how much technology was used.

Optimize for showing that the correct technology was used in the correct place.

The submission should make this architectural idea obvious:

> Deterministic software establishes what is true.
> AI understands qualitative preferences and explains why the result matters.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
