# Financial Intelligence Framework

> **Agent reference.** Read before designing AI Analysis for any calculator. This document governs the intelligence layer across the entire platform.

---

## 1. Product Vision

FinCalcSmart is an AI-assisted financial decision platform.

**Calculators are the engine. AI Analysis is the product.**

The job of every calculator is not to display a number — it is to help a user understand their financial position and know what to do next. A mortgage calculator that returns "$2,340/month" has failed if the user still does not know whether they can afford that house.

Every calculator must:
- Accept inputs and compute accurate results
- Interpret the result in plain language
- Flag risk and opportunity relative to the user's specific inputs
- Give the user a clear next step

---

## 2. Calculator Intelligence Model

Before building any calculator, define each of these dimensions. This definition drives the AI Analysis section, the default state, and the edge-case behavior.

| Dimension | Description |
|-----------|-------------|
| **User intent** | What decision is the user trying to make? |
| **Key inputs** | Which input values most change the outcome? |
| **Key outputs** | What numbers does the user actually act on? |
| **Primary decision metric** | The single most important output — the one that tells the user "yes or no" |
| **Risk signals** | Input combinations or output values that indicate financial stress |
| **Opportunity signals** | Input combinations or output values where the user could benefit from action |
| **Emotional concern** | What is the user worried about while filling in this form? |
| **Default state goal** | What should a first-time visitor with blank inputs understand from the default result? |
| **Edge-case behavior** | What happens at extremes (zero down, 100% LTV, very short amortization, etc.)? |

### Example — Mortgage Calculator

| Dimension | Value |
|-----------|-------|
| User intent | Can I afford this home? What will it cost monthly? |
| Key inputs | Home price, down payment, rate, amortization |
| Key outputs | Monthly payment, total interest paid, amortization schedule |
| Primary decision metric | Monthly payment vs. estimated budget |
| Risk signals | LTV > 80%, payment > 35% of stated income, rate stress-test failure |
| Opportunity signals | Rate 0.5%+ above current market, amortization > 25 years, large prepayment room |
| Emotional concern | "Am I paying too much? Am I locked in to a bad deal?" |
| Default state goal | Show a realistic but not alarming baseline — a median home, median rate |
| Edge-case behavior | Zero down → flag CMHC/PMI premium; rate = 0 → block or warn |

---

## 3. AI Analysis Rules

Every AI Analysis panel must answer these five questions in order. If the answer to any question is unavailable from the current inputs, omit it rather than guess.

1. **What does this result mean?** — Translate the primary output into plain language.
2. **Is the user in a good, borderline, or risky position?** — Give a clear status: healthy / watch / caution. Never leave this implicit.
3. **What is the main driver?** — Identify the single input that most influences the result.
4. **What can the user improve?** — Name one concrete lever the user controls.
5. **What should they watch out for?** — Name the most likely negative outcome and its trigger condition.

### Status Labels

Use exactly these three labels in AI Analysis status indicators:

| Label | Meaning |
|-------|---------|
| `Healthy` | Result is within accepted safe ranges; no immediate concern |
| `Watch` | Result is within range but close to a threshold; warrants attention |
| `Caution` | Result exceeds a risk threshold; user should take action before proceeding |

---

## 4. Insight Hierarchy

Present AI Analysis content in this order. Do not reorder without a documented reason.

1. **Primary result / status** — one sentence, includes the status label
2. **Key supporting metrics** — two or three numbers that explain the primary result
3. **Risk / warning** — what could go wrong; only show if a risk signal is present
4. **Opportunity / optimization** — what the user could improve; only show if an opportunity signal is present
5. **Next step** — one actionable sentence; links to a related calculator when relevant

If no risk signal is present, omit section 3. If no opportunity signal is present, omit section 4. Never pad with placeholder text.

---

## 5. Tone Rules

| Rule | Detail |
|------|--------|
| Clear | Use the simplest word that is accurate. No jargon without a one-clause definition. |
| Calm | Do not use alarm-word typography (red banners, exclamation points, all-caps warnings). |
| Helpful | Every paragraph should move the user closer to a decision. |
| Not alarmist | A caution status is not a crisis. Frame it as "worth addressing," not "danger." |
| Not financial advice | Use educational framing: "typically," "a common guideline is," "many lenders look for." Never "you should," "you must," or "this is right for you." |
| No overclaiming | Never state that a result guarantees approval, savings, or a specific outcome. |
| Consistent voice | Second person ("your payment," "your rate"). Active sentences. Present tense. |

**Avoid these phrases:**
- "You should definitely…"
- "This is a great deal"
- "You are in trouble"
- "Guaranteed savings of…"
- "As your financial advisor…"

---

## 6. Risk / Opportunity Framework

For each calculator, document this table in its intelligence model definition (see §2). Agents use this table to populate the AI Analysis conditions in code.

### Structure

```
Risk signals      → input or output conditions that trigger a Caution or Watch status
Opportunity signals → conditions where a concrete improvement is available to the user
Warning thresholds → the numeric boundary where a status escalates (e.g., DTI > 43%)
Improvement levers → the specific inputs the user can change to improve their position
Next-step guidance → the follow-on action or calculator to recommend
```

### Platform-wide thresholds (defaults — override per calculator if needed)

| Metric | Watch threshold | Caution threshold |
|--------|----------------|-------------------|
| Debt-to-income (DTI) | > 36% | > 43% |
| Loan-to-value (LTV) | > 80% | > 95% |
| Savings rate | < 15% | < 5% |
| Emergency fund | < 3 months | < 1 month |
| Retirement savings rate | < 10% | < 3% |

These thresholds are guidelines used for AI Analysis framing only. They do not affect math output.

---

## 7. New Calculator Pre-Build Requirements

Every new calculator must have each of the following defined and reviewed **before any code is written**. Incomplete definitions block implementation.

### 7.1 Strategy
- What financial decision does this calculator serve?
- Who is the primary user (first-time buyer, investor, retiree, etc.)?
- Which region(s) does it cover (USA, Canada, or both)?
- How does it relate to existing calculators (standalone, linked, companion)?

### 7.2 Math / Logic Spec
- Formula source (cite standard or regulatory reference where applicable)
- Canada-specific rules if applicable (semi-annual compounding, CMHC, stress test)
- USA-specific rules if applicable (PMI thresholds, conforming loan limits)
- All edge cases and their expected output behavior

### 7.3 AI Analysis Insight Plan
- Populate the full Calculator Intelligence Model table from §2
- Define the five AI Analysis answers from §3 for the expected result range
- List all risk signals with their threshold values
- List all opportunity signals with their trigger conditions

### 7.4 Default State Plan
- Define the default input values and the rationale for each
- Confirm the default result is representative and not misleading
- Confirm the default AI Analysis status is `Healthy` or `Watch` (never `Caution` on load)

### 7.5 Edge-Case Plan
Document expected behavior for:
- All-zero inputs
- Maximum plausible inputs (e.g., $10M home price)
- Negative or invalid values
- Region-switching mid-calculation
- Inputs that produce division-by-zero in the formula

### 7.6 SEO / FAQ Topics
- Target keyword (primary)
- Supporting keywords (2–4)
- Minimum 5 FAQ questions with answers
- Related calculators to cross-link

---

---

## 8. Product Sequence

Every calculator delivers value in this order. Do not reorder.

1. **Clear result first** — the primary output is immediate, above the fold, and unambiguous.
2. **Visual explanation second** — the visual cards show why that number is what it is, not what it could be.
3. **AI-assisted insight third** — the AI Analysis explains what the result means and what the user should do next.
4. **Scenario testing only when it naturally helps** — include comparison or scenario tools only when they directly help the user understand the impact of changing an input. Do not add them to encourage repeated use or create unnecessary complexity.

This sequence defines the product. Treat AI Analysis as the differentiator, not an appendix.

---

*Last updated: 2026-05-26*
