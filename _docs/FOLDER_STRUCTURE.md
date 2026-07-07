# Task 1 — Repository Cleanup & Target Folder Structure

## Files to Archive (move to `/archive/`)

These files are safe to move out of the active workspace. Agents scanning the repo will no longer be confused by stale or experimental code.

| File | Reason |
|------|--------|
| `app/canadian-mortgage-calculator/CanadaMortgageCalculator.backup.tsx` | Superseded by the finalized `.tsx` — kept only as a fallback snapshot |
| `brand-guidelines.html` | Replaced by `_docs/BRAND_GUIDELINES.md` |
| `files/` (folder) | Old scratch notes — context-notes.md and checklist.md are superseded by `_docs/` |
| `files.zip` | Source archive of the above — no longer needed |
| `Canadian Mortgage Calculator - Wireframe.png` | Design artefact — useful for reference only, not for agents |
| `FinCalc-Smart-Report-v1.pdf` | Superseded by v2 |
| `FinCalc-Smart-Report-v2.pdf` | Keep a copy in `/archive/` for reference |
| `FinCalcSmart.com Master Manifesto.md` | Superseded by `CLAUDE.md` + `_docs/` |
| `Master Project Declaration.docx` | Superseded by `_docs/` |
| `Project Knowledge-Instructions.docx` | Superseded by `_docs/AGENT_MANUAL.md` |
| `Role Prompt.docx` | Superseded by `CLAUDE.md` |
| `tsconfig.tsbuildinfo` | Build artifact — auto-regenerated, never commit |

**Shell commands to execute cleanup:**
```bash
mkdir archive
mv "Canadian Mortgage Calculator - Wireframe.png" archive/
mv FinCalc-Smart-Report-v1.pdf archive/
mv FinCalc-Smart-Report-v2.pdf archive/
mv "FinCalcSmart.com Master Manifesto.md" archive/
mv "Master Project Declaration.docx" archive/
mv "Project Knowledge-Instructions.docx" archive/
mv "Role Prompt.docx" archive/
mv brand-guidelines.html archive/
mv files/ archive/
mv files.zip archive/
mv app/canadian-mortgage-calculator/CanadaMortgageCalculator.backup.tsx archive/
rm tsconfig.tsbuildinfo
```

---

## Target Folder Structure (canonical — agents must follow this)

```
FinCalcSmart-V2/
│
├── CLAUDE.md                          ← Auto-loaded agent rules (DO NOT DELETE)
│
├── _docs/                             ← Agent documentation (DO NOT DELETE)
│   ├── AGENT_MANUAL.md
│   ├── AGENT_READINESS_CHECKLIST.md
│   ├── BRAND_GUIDELINES.md
│   └── FOLDER_STRUCTURE.md            ← this file
│
├── archive/                           ← Moved legacy files (agents ignore this folder)
│
├── app/
│   ├── layout.tsx                     ← Root layout: font, RegionProvider, Header, Footer
│   ├── globals.css                    ← Minimal global CSS (Tailwind base only)
│   ├── page.tsx                       ← Homepage (placeholder — needs full page later)
│   │
│   ├── _mortgage-shared/              ← Shared mortgage primitives
│   │   ├── math.ts                    ← All CA/US mortgage formulas
│   │   ├── ui.tsx                     ← NumericInput, Tooltip, DonutChart
│   │   └── InsightPanel.tsx           ← AI analysis panel
│   │
│   ├── calculators/
│   │   ├── layout.tsx                 ← Passthrough layout
│   │   └── page.tsx                   ← /calculators directory listing
│   │
│   ├── canadian-mortgage-calculator/
│   │   ├── page.tsx
│   │   └── CanadaMortgageCalculator.tsx   ← MASTER TEMPLATE — reference this
│   │
│   ├── us-mortgage-calculator/
│   │   ├── page.tsx
│   │   └── USAMortgageCalculator.tsx
│   │
│   │── [new-calculator-slug]/         ← Pattern for every new calculator
│   │   ├── page.tsx                   ← Server: metadata + layout wrapper
│   │   └── [Name]Calculator.tsx       ← Client: interactive logic
│   │
│   └── (future top-level pages)
│       ├── privacy/page.tsx
│       ├── terms/page.tsx
│       └── sitemap.xml/route.ts
│
├── components/
│   ├── layout/
│   │   ├── SiteHeader.tsx             ← FINALIZED — do not modify
│   │   ├── SiteFooter.tsx             ← FINALIZED — do not modify
│   │   ├── CalculatorLayout.tsx       ← FINALIZED — do not modify
│   │   └── CalculatorFaqAccordion.tsx
│   └── ui/
│       ├── AdSlot.tsx
│       └── RegionToggle.tsx
│
├── lib/
│   └── region/
│       └── context.tsx                ← RegionContext, useRegion()
│
├── public/                            ← Static assets (create if needed)
│   └── icons/                        ← Favicons, OG images
│
├── next.config.mjs
├── tailwind.config.ts                 ← Brand token source of truth
├── tsconfig.json
├── postcss.config.js
└── package.json
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Calculator page route | `kebab-case` with `calculator` suffix | `fire-calculator` |
| Calculator component | `PascalCase` + `Calculator` suffix | `FireCalculator.tsx` |
| Shared math module | `math.ts` inside `_[scope]-shared/` | `_retirement-shared/math.ts` |
| Shared UI module | `ui.tsx` inside `_[scope]-shared/` | `_retirement-shared/ui.tsx` |
| Page-level types | Defined at top of calculator file | `interface FormState {}` |
