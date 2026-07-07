# FinCalcSmart Agent Orchestration Protocol

> This file governs how the 4 specialized agents collaborate to ship a new calculator. Read this before initializing any agent.

---

## The 4-Agent Pipeline

Each new calculator passes through agents in strict sequential order. No agent starts until the previous agent's output has been verified.

```
┌─────────────────────────────────────────────────────────────┐
│  ORCHESTRATOR (human / Claude Code main session)            │
│  - Initializes each agent with the correct prompt           │
│  - Verifies handoff artifacts before passing to next agent  │
│  - Runs npm run build between each phase                    │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│  AGENT 1 — Core Math Architect                              │
│  File: _docs/agents/01_CORE_MATH_ARCHITECT.md               │
│  Output: [Name]Calculator.tsx (math + state only)           │
│  Delivers: working formulas, useMemo, Results interface     │
└───────────────┬─────────────────────────────────────────────┘
                │  Handoff artifact: calculator file with verified math
                ▼
┌─────────────────────────────────────────────────────────────┐
│  AGENT 2 — UI/UX Engine                                     │
│  File: _docs/agents/02_UIUX_ENGINE.md                       │
│  Output: complete JSX rendering, brand styling, charts      │
│  Delivers: pixel-accurate UI, dark results card, insights   │
└───────────────┬─────────────────────────────────────────────┘
                │  Handoff artifact: complete calculator component
                ▼
┌─────────────────────────────────────────────────────────────┐
│  AGENT 3 — SEO Copywriter                                   │
│  File: _docs/agents/03_SEO_COPYWRITER.md                    │
│  Output: page.tsx (metadata, FAQs, formulaSection)          │
│  Delivers: title, description, 4+ FAQs, JSON-LD schema      │
└───────────────┬─────────────────────────────────────────────┘
                │  Handoff artifact: complete page.tsx
                ▼
┌─────────────────────────────────────────────────────────────┐
│  AGENT 4 — QA Gatekeeper                                    │
│  File: _docs/agents/04_QA_GATEKEEPER.md                     │
│  Output: checklist pass/fail report + any required fixes    │
│  Delivers: build clean, lint clean, performance gate passed │
└─────────────────────────────────────────────────────────────┘
```

---

## Pre-Flight (Orchestrator runs before Agent 1)

1. Confirm `npm run build` → 0 errors on current codebase
2. Confirm target slug is listed in `_docs/AGENT_READINESS_CHECKLIST.md §F`
3. Confirm agent prompt includes all required fields from `_docs/AGENT_READINESS_CHECKLIST.md §E`
4. Create the calculator directory: `app/[slug]/`

---

## Handoff Protocol

### Agent 1 → Agent 2

Agent 1 must produce a file where:
- All `FormState` fields are typed
- All `Results` fields are typed and populated by `useMemo`
- Math has been manually verified (spot-check 2-3 input combinations)
- File compiles without TypeScript errors (`npx tsc --noEmit`)

Pass to Agent 2 the full path to the calculator file + confirmation of region scope.

### Agent 2 → Agent 3

Agent 2 must produce a file where:
- All form inputs render correctly (NumericInput or standard input)
- Dark results card (`ResultsPanel` or equivalent) is populated
- Brand tokens match `_docs/BRAND_GUIDELINES.md` exactly
- Mobile layout has been checked at 375px
- `npm run build` passes with 0 errors

Pass to Agent 3 the calculator name, slug, region scope, and the primary formula(s) used.

### Agent 3 → Agent 4

Agent 3 must produce `app/[slug]/page.tsx` where:
- `metadata.title` follows the pattern: `[Name] — [Country] [Category] Calculator | FinCalcSmart Pro`
- `metadata.description` is ≤ 150 chars and includes the primary keyword
- `FAQS` array has ≥ 4 items
- `formulaSection` JSX exists
- FAQPage JSON-LD schema is present

Pass to Agent 4 the slug, both file paths, and the performance gate requirements.

### Agent 4 → Orchestrator

Agent 4 returns a pass/fail report. If all gates pass, the orchestrator:
1. Updates `lib/calculators.ts → CALC_INDEX` to set `available: true` for the new calculator
2. Updates `components/layout/SiteHeader.tsx` if the calc is in a nav category
3. Commits all files
4. Updates `_docs/AGENT_READINESS_CHECKLIST.md §F` status to ✅ Live

---

## Mandatory Context for Every Agent

Every agent prompt MUST include:

```
You are working in the FinCalcSmart Pro codebase.
Before touching any file, read:
  1. CLAUDE.md (project root) — non-negotiable rules
  2. _docs/AGENT_MANUAL.md — scaffolding patterns and component API
  3. _docs/BRAND_GUIDELINES.md — all visual/token decisions
  4. _docs/AGENT_READINESS_CHECKLIST.md — completion gates

Master template reference: app/canadian-mortgage-calculator/CanadaMortgageCalculator.tsx
Shared math utilities: app/_mortgage-shared/math.ts
Shared UI primitives: app/_mortgage-shared/ui.tsx (NumericInput, Tooltip, DonutChart)
```

---

## Region Scope Reference

| Value | Meaning | `showRegionToggle` |
|-------|---------|-------------------|
| `ca` | Canada only | `false` |
| `us` | USA only | `false` |
| `both` | Dual-region | `true` |

Canada-only: do NOT import `useRegion()`. Hardcode all Canadian logic.
Dual-region: use `REGION_CONFIG` pattern from `_docs/AGENT_MANUAL.md §3.4`.

---

## Emergency Stop Rules

An agent MUST stop and report back to the orchestrator (do not self-fix) if:

- `npm run build` produces TypeScript errors not caused by the agent's own new file
- A required shared component (`ResultsPanel`, `NumericInput`, etc.) cannot be found at its documented path
- Any file in the "FINALIZED — do not modify" list would need to be changed to complete the task
- The financial formula cannot be sourced from a reliable reference (cite: Bank of Canada, IRS, CRA, or peer-reviewed financial textbook)
