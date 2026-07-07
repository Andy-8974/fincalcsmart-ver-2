# Agent Roles V2 — FinCalcSmart Build Workflow

> **Required reading before starting any new calculator.** No implementation begins until every role's pre-build output exists. This document defines who does what and in what order.

---

## Core Principle

**AI Analysis is the product differentiator. Calculators are the engine.**

The build workflow enforces this by making strategy, financial logic, and insight design mandatory gates before any code is written.

---

## Build Workflow

```
1. Product Strategy        →  business value confirmed, scope locked
2. Financial Planning      →  inputs/outputs/metrics/signals defined
3. AI Insight Architecture →  insight hierarchy + tone plan written
4. UX / System Design      →  block structure + responsive plan agreed
5. Implementation          →  code written against the spec above
6. QA / Validation         →  formulas, edge cases, UI states verified
```

Each stage produces a written output. The next stage does not start until the previous output exists.

---

## Role Definitions

### Role 1 — Product Strategy Agent

**Owns:** business case and scope for the calculator.

**Responsibilities:**
- Confirm the calculator serves a real financial decision the user needs to make
- Define which region(s) it covers and why
- Identify how it relates to existing calculators (standalone, companion, entry point)
- Reject scope additions that don't serve the primary user decision
- Confirm the calculator has a clear primary decision metric (the one number the user acts on)

**Output required before Role 2 starts:**
- One-paragraph business case: who it serves, what decision it supports, why it belongs on this platform
- Region scope: CA only / US only / dual-region, with differences listed
- Primary decision metric named

**Scope creep signals to block:**
- "While we're at it, let's also add…"
- Adding outputs that don't serve the primary decision
- Building both CA and US variants simultaneously when one would validate first

---

### Role 2 — Financial Planning Agent

**Owns:** the financial intelligence model for the calculator.

**Responsibilities:**
- Define all key inputs (required and optional) with default values and valid ranges
- Define all key outputs (primary result + secondary stats)
- Identify the primary decision metric (confirm or refine from Role 1)
- Map risk signals: input/output combinations that indicate financial stress
- Map opportunity signals: conditions where the user could take beneficial action
- Confirm warning thresholds against platform defaults (`FINANCIAL_INTELLIGENCE_FRAMEWORK.md §6`)
- Verify financial accuracy — formulas must match cited standards

**Output required before Role 3 starts:**
- Completed Calculator Intelligence Model table (`FINANCIAL_INTELLIGENCE_FRAMEWORK.md §2`)
- Risk signals list with threshold values
- Opportunity signals list with trigger conditions
- Math / logic spec with all formulas written out (see `CALCULATOR_TEMPLATE_V2.md §0 Step 2`)

**Signals of insufficient financial planning:**
- Inputs defined but no risk signals identified
- Outputs listed but no primary decision metric named
- Formulas not written down before coding begins

---

### Role 3 — AI Insight Architect Agent

**Owns:** the intelligence layer — what the calculator says about its results.

**Responsibilities:**
- Design the AI Analysis insight hierarchy (`FINANCIAL_INTELLIGENCE_FRAMEWORK.md §4`)
- Write the five-question AI Analysis plan for the expected result range (`FIF §3`)
- Assign status labels (Healthy / Watch / Caution) to result ranges
- Plan insight card content: what each card says, in what order, under what conditions
- Enforce tone rules (`FIF §5`): clear, calm, helpful, educational, never alarmist, never advice
- Ensure every insight connects a number to a meaning and a next step

**Output required before Role 4 starts:**
- Five-question AI Analysis answers written for low / mid / high result ranges
- Status label thresholds defined (what score or ratio triggers Watch vs Caution)
- Insight card plan: title, trigger condition, body copy direction for each card
- Confirmation that no insight overclaims or constitutes financial advice

**Tone violations to catch:**
- "You should definitely…" / "This is a great deal" / "You are in trouble"
- Caution status presented as a crisis rather than something to address
- Insight cards that show without a trigger condition (always-on noise)

---

### Role 4 — UX / System Design Agent

**Owns:** visual structure, responsive behavior, and template consistency.

**Responsibilities:**
- Map the calculator to the V2 block structure (`CALCULATOR_TEMPLATE_V2.md §2`)
- Confirm AI Analysis block placement and visual prominence — it must stand out as the primary product section
- Specify responsive layout at 375px / 768px / 1280px for every block
- Verify visual hierarchy: primary result is the most prominent number, AI Analysis is clearly differentiated from inputs/results
- Confirm card style matches the locked template (`border: '1px solid rgba(15,41,66,0.09)'`, `borderRadius: '20px'`)
- Flag any block that would be omitted from the V2 structure and confirm it is intentional

**Output required before Role 5 starts:**
- Block list in render order with any deviations from the standard structure noted and justified
- Responsive behavior per block at all three breakpoints
- Confirmation that AI Analysis block is always visible (Qualifier-type) or unlocked by CTA (mortgage-type)

**Template violations to catch:**
- AI Analysis buried below the fold with no clear unlock path
- Card style deviating from the locked template without user approval
- Mobile layout with horizontal overflow or blank states
- Adding blocks not in the V2 structure without explicit user instruction

---

### Role 5 — Calculator Logic Validator Agent

**Owns:** correctness of formulas, edge cases, and UI state completeness.

**Responsibilities:**
- Validate every formula against the math spec from Role 2
- Test all edge cases defined in `CALCULATOR_TEMPLATE_V2.md §0 Step 2` and `FIF §7.5`
- Verify default state: page loads with a positive, meaningful result — no blank, NaN, Infinity, or negative values
- Confirm all result states render a valid UI (not just the happy path)
- Run the full QA checklist from `CALCULATOR_TEMPLATE_V2.md §4` and `§14`
- Confirm `tsc --noEmit` passes with zero errors

**Specific validation checks:**
- CA mortgage: semi-annual compounding formula (`Math.pow(1 + annualRate / 200, 1/6) - 1`)
- CA qualifier: maxMortgage sized at stress rate, not contract rate (`AGENT_MANUAL.md §3.7`)
- All monetary outputs use `fmtCAD` / `fmtCADx` or equivalent — never raw `.toFixed(2)`
- `Number.isFinite(n) && n >= 0` guard before every monetary render
- `<Disclaimer />` rendered unconditionally at the bottom

**Signals that validation is incomplete:**
- Only the default / happy path has been tested
- Edge cases defined in the spec have not been exercised
- Visual self-check against the locked CA Mortgage Calculator V2 not completed

---

## Role Summary Table

| Role | Gate | Primary concern | Blocks next stage if… |
|------|------|-----------------|----------------------|
| 1 — Product Strategy | Pre-build | Business value + scope | No business case or unclear primary metric |
| 2 — Financial Planning | Pre-build | Financial accuracy + intelligence model | Intelligence model table incomplete |
| 3 — AI Insight Architect | Pre-build | Insight quality + tone | Insight plan not written |
| 4 — UX / System Design | Pre-build | Template + responsive structure | Block structure not mapped |
| 5 — Logic Validator | Post-build | Correctness + completeness | Any QA item unchecked |

---

## What These Roles Are Not

These are **responsibilities within a build**, not separate persons or separate sessions. A single agent working through a calculator build is expected to complete each role's output before moving to the next. The value of naming them is to prevent the most common failure mode: jumping straight to implementation (Role 5 work) before Roles 1–4 are done.

---

*Last updated: 2026-05-24*
