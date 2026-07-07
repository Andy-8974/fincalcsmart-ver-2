'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useRegion } from '@/lib/region/context';
import {
  monthlyRateCA,
  monthlyRateUS,
  calcPayment,
  fmtCAD,
  fmtCADx,
  fmtUSD,
  fmtUSDx,
} from '@/app/_mortgage-shared/math';
import { NumericInput, Tooltip, DonutChart, Disclaimer, type PieSlice } from '@/app/_mortgage-shared/ui';
import { inputCls, type Faq } from '@/components/layout/CalculatorLayout';
import CalculatorFaqAccordion from '@/components/layout/CalculatorFaqAccordion';
import MobileCalcCTA from '@/components/ui/MobileCalcCTA';
import { BookOpen, HelpCircle, Sparkles, Download, Mail, CheckCircle2, AlertTriangle, XCircle, DollarSign, Activity, TrendingUp, ShieldCheck, ShieldAlert, Check, X, ClipboardCheck } from 'lucide-react';
import { buildMortgageQualifierPDF } from '@/lib/pdf/adapters/mortgageQualifierAdapter';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
  annualIncome: string;
  coApplicantIncome: string;
  annualRate: string;
  amortization: string;
  propertyTax: string;
  heatingCosts: string;
  carPayment: string;
  creditCardMin: string;
  otherDebts: string;
  downPayment: string;
}

interface Results {
  gdsRatio: number;
  tdsRatio: number;
  gdsLimit: number;
  tdsLimit: number;
  gdsPass: boolean;
  tdsPass: boolean;
  maxMonthlyPayment: number;
  maxMortgage: number;
  maxHomePrice: number;
  monthlyIncome: number;
  totalMonthlyDebts: number;
  monthlyPI: number;
  monthlyHousing: number;
  verdict: 'approved' | 'borderline' | 'declined';
  verdictReason: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULTS: FormState = {
  annualIncome: '95000',
  coApplicantIncome: '0',
  annualRate: '5.25',
  amortization: '25',
  propertyTax: '4800',
  heatingCosts: '150',
  carPayment: '0',
  creditCardMin: '0',
  otherDebts: '0',
  downPayment: '80000',
};

// ── Styles ────────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  border: '1px solid rgba(15,41,66,0.09)',
  borderRadius: '20px',
  background: '#ffffff',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 2px 10px rgba(0,0,0,0.03)',
};

const inputClsCompact = inputCls
  .replace('py-2.5', 'py-1 md:py-2')
  .replace('px-3', 'pr-2 md:pr-3 pl-3');

const navyLabelStyle: React.CSSProperties = {
  fontWeight: 700, color: '#0D1B2A', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4,
};
const navyLabelCls = 'text-[10px] md:text-xs';

// ── Tooltips ──────────────────────────────────────────────────────────────────

const TOOLTIPS = {
  annualIncome: 'Gross annual income before taxes for the primary applicant. Include salary, self-employment, rental, and other regular sources.',
  coApplicantIncome: 'If applying with a partner or co-borrower, add their gross annual income to increase combined qualifying power.',
  annualRate: 'Your expected mortgage interest rate. In Canada, the B-20 stress test adds 2% on top of this rate when qualifying.',
  amortization: 'Total repayment period. Maximum 25 years for insured mortgages (down < 20%). Up to 30 years for conventional (down ≥ 20%).',
  downPayment: 'Cash toward the purchase. 20%+ down avoids CMHC insurance and raises your GDS limit from 32% to 39%.',
  propertyTax: 'Estimated annual property tax on the home you plan to buy. Included in both GDS and TDS ratio calculations.',
  heatingCosts: 'Monthly heating and utility costs. For condos, include monthly maintenance fees. Included in GDS and TDS calculations.',
  carPayment: 'Monthly car loan or lease payments. Counted in TDS (total debt) ratio only.',
  creditCardMin: 'Total of all minimum monthly credit card payments across all cards. Counted in TDS ratio only.',
  otherDebts: 'Other monthly obligations: student loans, personal loans, spousal/child support. Counted in TDS ratio only.',
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface MortgageQualifierProps {
  formulaContent?: ReactNode;
  faqItems: Faq[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MortgageQualifierCalculator({ formulaContent, faqItems }: MortgageQualifierProps) {
  const { region } = useRegion();

  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [aiCtaHovered, setAiCtaHovered] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ── Math (Agent 1 — do not modify) ────────────────────────────────────────

  const results = useMemo((): Results | null => {
    const annualIncome     = parseFloat(form.annualIncome)      || 0;
    const coApplicant      = parseFloat(form.coApplicantIncome) || 0;
    const annualRate       = parseFloat(form.annualRate);
    const amortYears       = parseInt(form.amortization);
    const annualPropTax    = parseFloat(form.propertyTax)       || 0;
    const monthlyHeating   = parseFloat(form.heatingCosts)      || 0;
    const carPayment       = parseFloat(form.carPayment)        || 0;
    const creditCardMin    = parseFloat(form.creditCardMin)     || 0;
    const otherDebts       = parseFloat(form.otherDebts)        || 0;
    const downPayment      = parseFloat(form.downPayment)       || 0;

    const monthlyIncome = (annualIncome + coApplicant) / 12;
    if (monthlyIncome <= 0) return null;
    if (isNaN(annualRate) || annualRate <= 0 || annualRate > 30) return null;
    if (isNaN(amortYears) || amortYears < 1 || amortYears > 30) return null;

    const n = amortYears * 12;
    const monthlyTax        = annualPropTax / 12;
    const totalMonthlyDebts = carPayment + creditCardMin + otherDebts;

    if (region === 'ca') {
      // Source: OSFI Guideline B-20, CMHC Homeowner Mortgage Loan Insurance
      const stressRate = Math.max(annualRate + 2, 5.25);
      const rStress    = monthlyRateCA(stressRate);

      // First pass: assume conventional (39/44) to check insurance status
      const maxGdsPI1 = (39 / 100) * monthlyIncome - monthlyTax - monthlyHeating;
      const maxTdsPI1 = (44 / 100) * monthlyIncome - monthlyTax - monthlyHeating - totalMonthlyDebts;
      const maxPI1    = Math.min(maxGdsPI1, maxTdsPI1);
      if (maxPI1 <= 0) {
        // Housing costs alone consume the full qualifying budget — no P&I room remains.
        // Return a zero-capacity declined result so the UI stays visible.
        const gdsLimitFb = 39; // matches the limit tested in this first pass
        const tdsLimitFb = 44;
        const gdsRatioFb = ((monthlyTax + monthlyHeating) / monthlyIncome) * 100;
        const tdsRatioFb = ((monthlyTax + monthlyHeating + totalMonthlyDebts) / monthlyIncome) * 100;
        return {
          gdsRatio: gdsRatioFb, tdsRatio: tdsRatioFb,
          gdsLimit: gdsLimitFb, tdsLimit: tdsLimitFb,
          gdsPass: gdsRatioFb <= gdsLimitFb, tdsPass: tdsRatioFb <= tdsLimitFb,
          maxMonthlyPayment: 0, maxMortgage: 0,
          maxHomePrice: downPayment,
          monthlyIncome, totalMonthlyDebts,
          monthlyPI: 0, monthlyHousing: monthlyTax + monthlyHeating,
          verdict: 'declined' as const,
          verdictReason: 'Monthly housing costs exceed qualifying capacity. No mortgage qualifies under standard guidelines.',
        };
      }

      const maxMortgage1 = maxPI1 * (1 - Math.pow(1 + rStress, -n)) / rStress;
      const downPct1     = downPayment / (maxMortgage1 + downPayment) * 100;
      const isInsured1   = downPct1 < 20;

      // Second pass with correct GDS limit
      const gdsLimit = isInsured1 ? 32 : 39;
      const tdsLimit = 44;

      const maxGdsPI = (gdsLimit / 100) * monthlyIncome - monthlyTax - monthlyHeating;
      const maxTdsPI = (tdsLimit / 100) * monthlyIncome - monthlyTax - monthlyHeating - totalMonthlyDebts;
      const maxPI    = Math.min(maxGdsPI, maxTdsPI);
      if (maxPI <= 0) {
        // Debts + housing costs exceed the qualifying budget — no positive P&I capacity.
        const gdsRatioFb = ((monthlyTax + monthlyHeating) / monthlyIncome) * 100;
        const tdsRatioFb = ((monthlyTax + monthlyHeating + totalMonthlyDebts) / monthlyIncome) * 100;
        return {
          gdsRatio: gdsRatioFb, tdsRatio: tdsRatioFb,
          gdsLimit, tdsLimit,
          gdsPass: gdsRatioFb <= gdsLimit, tdsPass: tdsRatioFb <= tdsLimit,
          maxMonthlyPayment: 0, maxMortgage: 0,
          maxHomePrice: downPayment,
          monthlyIncome, totalMonthlyDebts,
          monthlyPI: 0, monthlyHousing: monthlyTax + monthlyHeating,
          verdict: 'declined' as const,
          verdictReason: 'Monthly debt and housing costs exceed qualifying capacity. No mortgage qualifies under standard guidelines.',
        };
      }

      // maxMortgage sized at stress rate — the actual B-20 qualifying limit.
      // (A contract-rate–sized mortgage is larger but fails the stress-rate ratio check,
      // so we report the stress-rate capacity and show the actual contract-rate payment below.)
      const r          = monthlyRateCA(annualRate);
      const maxMortgage = maxPI * (1 - Math.pow(1 + rStress, -n)) / rStress;
      const maxHomePrice = maxMortgage + downPayment;

      const monthlyPI      = calcPayment(maxMortgage, r, n);
      const monthlyHousing = monthlyPI + monthlyTax + monthlyHeating;

      // Ratios computed at stress rate to reflect actual lender test
      const stressPI   = calcPayment(maxMortgage, rStress, n);
      const stressPITH = stressPI + monthlyTax + monthlyHeating;
      const gdsRatio   = (stressPITH / monthlyIncome) * 100;
      const tdsRatio   = ((stressPITH + totalMonthlyDebts) / monthlyIncome) * 100;

      const gdsPass = gdsRatio <= gdsLimit;
      const tdsPass = tdsRatio <= tdsLimit;

      const verdict: Results['verdict'] =
        gdsPass && tdsPass ? 'approved' :
        (!gdsPass && gdsRatio < gdsLimit + 5) || (!tdsPass && tdsRatio < tdsLimit + 5)
          ? 'borderline' : 'declined';

      const verdictReason =
        verdict === 'approved'   ? 'Your income and debt profile meet standard qualification thresholds.' :
        verdict === 'borderline' ? 'You are close to the limit — a lender may approve with compensating factors.' :
                                   'Your debt ratios exceed standard limits. Reduce debts or increase income to qualify.';

      return {
        gdsRatio, tdsRatio, gdsLimit, tdsLimit, gdsPass, tdsPass,
        maxMonthlyPayment: maxPI, maxMortgage, maxHomePrice,
        monthlyIncome, totalMonthlyDebts, monthlyPI, monthlyHousing,
        verdict, verdictReason,
      };

    } else {
      // Source: Consumer Financial Protection Bureau (CFPB) 28/36 qualification guidelines
      const r        = monthlyRateUS(annualRate);
      const gdsLimit = 28;
      const tdsLimit = 36;

      const maxFrontPI = (gdsLimit / 100) * monthlyIncome - monthlyTax - monthlyHeating;
      const maxBackPI  = (tdsLimit / 100) * monthlyIncome - monthlyTax - monthlyHeating - totalMonthlyDebts;
      const maxPI      = Math.min(maxFrontPI, maxBackPI);
      if (maxPI <= 0) {
        // Debts + housing costs exceed the qualifying budget — no positive P&I capacity.
        const gdsRatioFb = ((monthlyTax + monthlyHeating) / monthlyIncome) * 100;
        const tdsRatioFb = ((monthlyTax + monthlyHeating + totalMonthlyDebts) / monthlyIncome) * 100;
        return {
          gdsRatio: gdsRatioFb, tdsRatio: tdsRatioFb,
          gdsLimit, tdsLimit,
          gdsPass: gdsRatioFb <= gdsLimit, tdsPass: tdsRatioFb <= tdsLimit,
          maxMonthlyPayment: 0, maxMortgage: 0,
          maxHomePrice: downPayment,
          monthlyIncome, totalMonthlyDebts,
          monthlyPI: 0, monthlyHousing: monthlyTax + monthlyHeating,
          verdict: 'declined' as const,
          verdictReason: 'Monthly debt and housing costs exceed qualifying capacity. No mortgage qualifies under standard guidelines.',
        };
      }

      const maxMortgage  = maxPI * (1 - Math.pow(1 + r, -n)) / r;
      const maxHomePrice = maxMortgage + downPayment;

      const monthlyPI      = calcPayment(maxMortgage, r, n);
      const monthlyHousing = monthlyPI + monthlyTax + monthlyHeating;

      const gdsRatio = (monthlyHousing / monthlyIncome) * 100;
      const tdsRatio = ((monthlyHousing + totalMonthlyDebts) / monthlyIncome) * 100;

      const gdsPass = gdsRatio <= gdsLimit;
      const tdsPass = tdsRatio <= tdsLimit;

      const verdict: Results['verdict'] =
        gdsPass && tdsPass ? 'approved' :
        (!gdsPass && gdsRatio < gdsLimit + 5) || (!tdsPass && tdsRatio < tdsLimit + 5)
          ? 'borderline' : 'declined';

      const verdictReason =
        verdict === 'approved'   ? 'Your income and debt profile meet standard qualification thresholds.' :
        verdict === 'borderline' ? 'You are close to the limit — a lender may approve with compensating factors.' :
                                   'Your debt ratios exceed standard limits. Reduce debts or increase income to qualify.';

      return {
        gdsRatio, tdsRatio, gdsLimit, tdsLimit, gdsPass, tdsPass,
        maxMonthlyPayment: maxPI, maxMortgage, maxHomePrice,
        monthlyIncome, totalMonthlyDebts, monthlyPI, monthlyHousing,
        verdict, verdictReason,
      };
    }
  }, [
    form.annualIncome, form.coApplicantIncome, form.annualRate, form.amortization,
    form.propertyTax, form.heatingCosts, form.carPayment, form.creditCardMin,
    form.otherDebts, form.downPayment, region,
  ]);

  // ── Display helpers ───────────────────────────────────────────────────────

  const isCA   = region === 'ca';
  const fmt    = isCA ? fmtCAD  : fmtUSD;
  const fmtx   = isCA ? fmtCADx : fmtUSDx;

  // CA stress test display rate (presentation only, derived from form input)
  const stressRateDisplay = isCA
    ? Math.max(parseFloat(form.annualRate || '0') + 2, 5.25).toFixed(2)
    : null;

  const VERDICT_CONFIG = {
    approved: {
      darkBg:  'rgba(16,185,129,0.18)',
      darkBorder: 'rgba(16,185,129,0.45)',
      color:   '#10B981',
      lightBg: '#ECFDF5',
      lightBorder: '#A7F3D0',
      label:   isCA ? 'Qualifies — GDS & TDS Pass' : 'Qualifies — 28/36 Rule Pass',
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
    },
    borderline: {
      darkBg:  'rgba(245,158,11,0.18)',
      darkBorder: 'rgba(245,158,11,0.45)',
      color:   '#F59E0B',
      lightBg: '#FFFBEB',
      lightBorder: '#FDE68A',
      label:   'Borderline — May Qualify With Compensating Factors',
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      ),
    },
    declined: {
      darkBg:  'rgba(239,68,68,0.18)',
      darkBorder: 'rgba(239,68,68,0.45)',
      color:   '#EF4444',
      lightBg: '#FEF2F2',
      lightBorder: '#FECACA',
      label:   'Does Not Qualify — Ratios Exceed Limits',
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      ),
    },
  } as const;

  // Derive display verdict from 1dp-rounded ratios for consistency with what the user sees.
  // Avoids floating-point artifacts when the displayed value is exactly at the limit.
  // Borderline fires ONLY when ratios exceed the limit but are within 5pp — a genuine near-miss.
  // Passing ratios always yield approved (max-mortgage math lands near the limit by design).
  const displayGdsPass = results ? Math.round(results.gdsRatio * 10) / 10 <= results.gdsLimit : false;
  const displayTdsPass = results ? Math.round(results.tdsRatio * 10) / 10 <= results.tdsLimit : false;
  const displayVerdict: Results['verdict'] | null = !results ? null
    : displayGdsPass && displayTdsPass
      ? 'approved'
      : (!displayGdsPass && results.gdsRatio < results.gdsLimit + 5) || (!displayTdsPass && results.tdsRatio < results.tdsLimit + 5)
        ? 'borderline'
        : 'declined';
  const displayVerdictReason = displayVerdict === 'approved'
    ? 'You qualify at your maximum borrowing capacity. Both ratios are within lender limits.'
    : displayVerdict === 'borderline'
    ? 'Your ratios narrowly exceed the limit. A small reduction in debt or increase in income may be enough.'
    : 'Your debt ratios exceed standard limits. Reduce debts or increase income to qualify.';

  const vc = displayVerdict ? VERDICT_CONFIG[displayVerdict] : null;

  // ── Shared ratio state — single source of truth for color/badge/wording ───
  // 'pass'     = ratio < limit (comfortably within)    → green
  // 'at-limit' = ratio === limit (1dp-rounded exactly) → amber
  // 'over'     = ratio > limit                         → red
  function ratioStateOf(ratio: number, limit: number): 'pass' | 'at-limit' | 'over' {
    const r = Math.round(ratio * 10) / 10;
    if (r > limit)   return 'over';
    if (r === limit) return 'at-limit';
    return 'pass';
  }
  const RATIO_COLORS = {
    'pass':     { dark: '#1DB584', lightText: '#059669', lightBg: '#ECFDF5', badgeTxt: 'Within limit'      },
    'at-limit': { dark: '#F59E0B', lightText: '#D97706', lightBg: '#FFFBEB', badgeTxt: 'At estimated limit' },
    'over':     { dark: '#EF4444', lightText: '#DC2626', lightBg: '#FEF2F2', badgeTxt: 'Over limit'        },
  } as const;

  const gdsChip = results
    ? (() => { const s = ratioStateOf(results.gdsRatio, results.gdsLimit); return { bg: RATIO_COLORS[s].lightBg, clr: RATIO_COLORS[s].lightText }; })()
    : { bg: '#ECFDF5', clr: '#059669' };
  const tdsChip = results
    ? (() => { const s = ratioStateOf(results.tdsRatio, results.tdsLimit); return { bg: RATIO_COLORS[s].lightBg, clr: RATIO_COLORS[s].lightText }; })()
    : { bg: '#ECFDF5', clr: '#059669' };

  // Snapshot donut slices: Mortgage vs Down Payment
  const snapshotSlices: PieSlice[] = results ? [
    { label: 'Max Mortgage', value: results.maxMortgage,                    color: '#1DB584', alwaysShow: true },
    { label: 'Down Payment', value: parseFloat(form.downPayment) || 1,      color: '#F59E0B', alwaysShow: true },
  ] : [];

  // Annuity factor for "debt impact" insight (maxMortgage per dollar of P&I capacity)
  const annuityFactor = results && results.maxMonthlyPayment > 0
    ? results.maxMortgage / results.maxMonthlyPayment
    : 0;

  // CTA button default text — adapts to verdict
  const ctaDefaultText = results
    ? displayVerdict === 'declined'
      ? 'See How to Improve Your Qualification ↓'
      : `Qualify for Up to ${fmt(results.maxHomePrice)} ↓`
    : '';

  // ── Ratio card helper ─────────────────────────────────────────────────────

  function RatioCard({
    label, sublabel, ratio, limit, components, slices, centerValue, centerLabel,
  }: {
    label: string; sublabel: string;
    ratio: number; limit: number;
    components: string[];
    slices?: PieSlice[]; centerValue?: string; centerLabel?: string;
  }) {
    const displayRatio = Math.round(ratio * 10) / 10;
    const fillPct   = Math.min((displayRatio / limit) * 100, 100);
    const state     = ratioStateOf(ratio, limit);
    const rc        = RATIO_COLORS[state];
    const barColor  = rc.dark;
    const numColor  = rc.dark;
    const badgeBg   = rc.lightBg;
    const badgeClr  = rc.lightText;
    const badgeTxt  = rc.badgeTxt;
    const isOver    = state === 'over';

    return (
      <div style={cardStyle} className="p-5 md:p-6 h-full flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>{label}</p>
            <p className="text-xs" style={{ color: '#9BA8B5' }}>{sublabel}</p>
          </div>
          <span
            className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ background: badgeBg, color: badgeClr }}
          >
            {badgeTxt}
          </span>
        </div>

        {/* Ratio number + chart */}
        <div className="flex items-center gap-5">
          {slices && (
            <DonutChart
              slices={slices}
              className="w-28 h-28 shrink-0"
              centerValue={centerValue}
              centerLabel={centerLabel}
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[38px] font-extrabold leading-none" style={{ color: numColor, letterSpacing: '-1.5px' }}>
              {ratio.toFixed(1)}<span className="text-xl font-bold ml-0.5">%</span>
            </p>
            <p className="text-xs mt-1" style={{ color: '#9BA8B5' }}>
              limit: <span className="font-semibold" style={{ color: '#6B7A8D' }}>{limit}%</span>
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: '#F1F4F7' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${fillPct}%`, background: barColor }}
            />
          </div>
          {isOver && (
            <p className="mt-1 text-xs font-medium" style={{ color: '#EF4444' }}>
              Exceeds limit by {(ratio - limit).toFixed(1)}pp
            </p>
          )}
        </div>

        {/* Components list */}
        <div style={{ borderTop: '1px solid #F1F4F7', paddingTop: 12 }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#9BA8B5' }}>
            Includes
          </p>
          <ul className="space-y-1">
            {components.map((c) => (
              <li key={c} className="flex items-center gap-2 text-xs" style={{ color: '#6B7A8D' }}>
                <span className="w-1 h-1 rounded-full shrink-0 bg-brand-gray-400" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // ── Ratio row helper (for Affordability Ratios card) ─────────────────────

  function RatioRow({
    label, ratio, limit, components,
  }: {
    label: string; ratio: number; limit: number; components: string[];
  }) {
    const displayRatio = Math.round(ratio * 10) / 10;
    const state    = ratioStateOf(ratio, limit);
    const rc       = RATIO_COLORS[state];
    const barColor = rc.dark;
    const numColor = rc.lightText;
    const badgeBg  = rc.lightBg;
    const badgeClr = rc.lightText;
    const badgeTxt = rc.badgeTxt;
    const fillPct  = Math.min((displayRatio / limit) * 100, 100);
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>{label}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-base font-extrabold tabular-nums" style={{ color: numColor }}>{displayRatio}%</span>
            <span className="text-xs" style={{ color: '#9BA8B5' }}>/ {limit}%</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap" style={{ background: badgeBg, color: badgeClr }}>
              {badgeTxt}
            </span>
          </div>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#F1F4F7' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${fillPct}%`, background: barColor }} />
        </div>
        {state === 'over' && (
          <p className="text-xs font-medium" style={{ color: rc.lightText }}>
            Exceeds limit by {(displayRatio - limit).toFixed(1)}pp
          </p>
        )}
        <p className="text-xs leading-relaxed" style={{ color: '#9BA8B5' }}>
          Includes: {components.join(' · ')}
        </p>
      </div>
    );
  }

  async function handleDownloadPDF() {
    if (!results || pdfLoading) return;
    setPdfLoading(true);
    try {
      await buildMortgageQualifierPDF({
        annualIncome:       parseFloat(form.annualIncome)      || 0,
        coApplicantIncome:  parseFloat(form.coApplicantIncome) || 0,
        annualRate:         parseFloat(form.annualRate)        || 0,
        amortization:       parseFloat(form.amortization)      || 0,
        propertyTax:        parseFloat(form.propertyTax)       || 0,
        heatingCosts:       parseFloat(form.heatingCosts)      || 0,
        downPayment:        parseFloat(form.downPayment)       || 0,
        carPayment:         parseFloat(form.carPayment)        || 0,
        creditCardMin:      parseFloat(form.creditCardMin)     || 0,
        otherDebts:         parseFloat(form.otherDebts)        || 0,
        gdsRatio:           results.gdsRatio,
        tdsRatio:           results.tdsRatio,
        gdsLimit:           results.gdsLimit,
        tdsLimit:           results.tdsLimit,
        gdsPass:            results.gdsPass,
        tdsPass:            results.tdsPass,
        maxMortgage:        results.maxMortgage,
        maxHomePrice:       results.maxHomePrice,
        monthlyIncome:      results.monthlyIncome,
        totalMonthlyDebts:  results.totalMonthlyDebts,
        monthlyPI:          results.monthlyPI,
        monthlyHousing:     results.monthlyHousing,
        verdict:            results.verdict,
        verdictReason:      results.verdictReason,
        region,
      });
    } catch (e) {
      console.error('PDF generation failed', e);
    } finally {
      setPdfLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-y-6 md:gap-y-8">

        {/* ── Block A: Input (7) + Results (5) ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Input Card — col-span-7 */}
          <div className="lg:col-span-7" style={cardStyle}>
            <div className="p-5 md:p-6">

              {/* Card header */}
              <div className="flex items-center gap-2.5 mb-4">
                <div style={{ width: 30, height: 30, borderRadius: 7, background: '#1DB584', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClipboardCheck size={15} color="white" strokeWidth={2} aria-hidden />
                </div>
                <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>Qualification Details</p>
              </div>

              {/* 2-column grid */}
              <div className="grid grid-cols-2 gap-x-2 md:gap-x-5">

                {/* Left: Income + Mortgage Terms */}
                <div className="space-y-2.5 min-w-0">

                  {/* ── Income ── */}
                  <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9BA8B5' }}>
                    Income
                  </p>

                  <div>
                    <label className={navyLabelCls} style={navyLabelStyle}>
                      Annual Household Income <Tooltip text={TOOLTIPS.annualIncome} />
                    </label>
                    <NumericInput value={form.annualIncome} onChange={(v) => set('annualIncome', v)} prefix={isCA ? 'CA$' : '$'} inputClassName={inputClsCompact} placeholder="95,000" />
                  </div>

                  <div>
                    <label className={navyLabelCls} style={navyLabelStyle}>
                      Co-Applicant Income <Tooltip text={TOOLTIPS.coApplicantIncome} />
                    </label>
                    <NumericInput value={form.coApplicantIncome} onChange={(v) => set('coApplicantIncome', v)} prefix={isCA ? 'CA$' : '$'} inputClassName={inputClsCompact} placeholder="0" />
                  </div>

                  {/* ── Mortgage Terms ── */}
                  <div className="pt-1" style={{ borderTop: '1px solid #F1F4F7' }}>
                    <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: '#9BA8B5' }}>
                      Mortgage Terms
                    </p>
                  </div>

                  <div>
                    <label className={navyLabelCls} style={navyLabelStyle}>
                      Interest Rate <Tooltip text={TOOLTIPS.annualRate} />
                    </label>
                    <NumericInput value={form.annualRate} onChange={(v) => set('annualRate', v)} suffix="%" inputClassName={inputClsCompact} placeholder="5.25" />
                  </div>

                  <div>
                    <label className={navyLabelCls} style={navyLabelStyle}>
                      Amortization <Tooltip text={TOOLTIPS.amortization} />
                    </label>
                    <select
                      value={form.amortization}
                      onChange={(e) => set('amortization', e.target.value)}
                      className={inputClsCompact}
                      aria-label="Amortization period"
                    >
                      {[5, 10, 15, 20, 25, 30].map((y) => (
                        <option key={y} value={String(y)}>{y} years{y === 25 ? ' (standard)' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={navyLabelCls} style={navyLabelStyle}>
                      Down Payment <Tooltip text={TOOLTIPS.downPayment} />
                    </label>
                    <NumericInput value={form.downPayment} onChange={(v) => set('downPayment', v)} prefix={isCA ? 'CA$' : '$'} inputClassName={inputClsCompact} placeholder="80,000" />
                  </div>

                </div>{/* end left column */}

                {/* Right: Monthly Costs + Debts */}
                <div className="border-l pl-2 md:pl-5 space-y-2.5 min-w-0" style={{ borderColor: 'rgba(15,41,66,0.09)' }}>

                  {/* ── Housing Costs ── */}
                  <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9BA8B5' }}>
                    Monthly Housing Costs
                  </p>

                  <div>
                    <label className={navyLabelCls} style={navyLabelStyle}>
                      Annual Property Tax <Tooltip text={TOOLTIPS.propertyTax} />
                    </label>
                    <NumericInput value={form.propertyTax} onChange={(v) => set('propertyTax', v)} prefix="$" inputClassName={inputClsCompact} placeholder="4,800" />
                  </div>

                  <div>
                    <label className={navyLabelCls} style={navyLabelStyle}>
                      Heating &amp; Condo Fees <Tooltip text={TOOLTIPS.heatingCosts} />
                    </label>
                    <NumericInput value={form.heatingCosts} onChange={(v) => set('heatingCosts', v)} prefix="$" inputClassName={inputClsCompact} placeholder="150" />
                  </div>

                  {/* ── Monthly Debts ── */}
                  <div className="pt-1" style={{ borderTop: '1px solid #F1F4F7' }}>
                    <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: '#9BA8B5' }}>
                      Monthly Debt Obligations
                    </p>
                  </div>

                  <div>
                    <label className={navyLabelCls} style={navyLabelStyle}>
                      Car Payment <Tooltip text={TOOLTIPS.carPayment} />
                    </label>
                    <NumericInput value={form.carPayment} onChange={(v) => set('carPayment', v)} prefix="$" inputClassName={inputClsCompact} placeholder="0" />
                  </div>

                  <div>
                    <label className={navyLabelCls} style={navyLabelStyle}>
                      Credit Card Minimums <Tooltip text={TOOLTIPS.creditCardMin} />
                    </label>
                    <NumericInput value={form.creditCardMin} onChange={(v) => set('creditCardMin', v)} prefix="$" inputClassName={inputClsCompact} placeholder="0" />
                  </div>

                  <div>
                    <label className={navyLabelCls} style={navyLabelStyle}>
                      Other Monthly Debts <Tooltip text={TOOLTIPS.otherDebts} />
                    </label>
                    <NumericInput value={form.otherDebts} onChange={(v) => set('otherDebts', v)} prefix="$" inputClassName={inputClsCompact} placeholder="0" />
                  </div>

                </div>{/* end right column */}

              </div>
            </div>
          </div>{/* end Input Card */}

          {/* Mobile-only CTA — scroll to results */}
          <div className="lg:hidden">
            <MobileCalcCTA />
          </div>

          {/* Dark Navy Results Card — col-span-5 */}
          <div id="calc-results" className="lg:col-span-5" style={{ scrollMarginTop: '80px' }}>
            <div
              className="flex flex-col h-full p-5 md:p-6 rounded-[16px]"
              style={{
                background: 'linear-gradient(150deg, #0D2137 0%, #0A1628 55%, #0D1B2A 100%)',
                border: '1px solid rgba(29,181,132,0.15)',
                minHeight: 380,
              }}
            >
              {results && vc ? (
                <div className="flex flex-col flex-1 gap-4">

                  {/* Verdict badge — hero element */}
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                    style={{ background: vc.darkBg, border: `1px solid ${vc.darkBorder}` }}
                  >
                    <span style={{ color: vc.color }}>{vc.icon}</span>
                    <p className="text-sm font-bold leading-tight" style={{ color: vc.color }}>
                      {vc.label}
                    </p>
                  </div>

                  {/* Max Home Budget — primary result */}
                  <div className="rounded-lg p-4 border border-slate-700" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
                      Maximum Home Budget
                    </p>
                    <p style={{ color: '#1DB584', fontSize: '40px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, marginTop: 6 }}>
                      {fmt(results.maxHomePrice)}
                    </p>
                    {isCA && (
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginTop: 4, fontStyle: 'italic' }}>
                        Based on B-20 stress test at {stressRateDisplay}%
                      </p>
                    )}
                  </div>

                  {/* Max Mortgage + Monthly P&I */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
                        Max Mortgage
                      </p>
                      <p style={{ fontSize: '18px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.5px', marginTop: 4 }}>
                        {fmt(results.maxMortgage)}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
                        Est. Monthly P&amp;I
                      </p>
                      <p style={{ fontSize: '18px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.5px', marginTop: 4 }}>
                        {fmtx(results.monthlyPI)}
                      </p>
                    </div>
                  </div>

                  {/* GDS + TDS quick stats */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
                          {isCA ? 'GDS Ratio' : 'Front-End'}
                        </p>
                        <p style={{ fontSize: '20px', fontWeight: 800, color: RATIO_COLORS[ratioStateOf(results.gdsRatio, results.gdsLimit)].dark, letterSpacing: '-0.5px', marginTop: 3 }}>
                          {results.gdsRatio.toFixed(1)}%
                        </p>
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                          limit {results.gdsLimit}%
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
                          {isCA ? 'TDS Ratio' : 'Back-End'}
                        </p>
                        <p style={{ fontSize: '20px', fontWeight: 800, color: RATIO_COLORS[ratioStateOf(results.tdsRatio, results.tdsLimit)].dark, letterSpacing: '-0.5px', marginTop: 3 }}>
                          {results.tdsRatio.toFixed(1)}%
                        </p>
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                          limit {results.tdsLimit}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1" />

                  {/* AI CTA button */}
                  <style>{`
                    @keyframes teal-glow-pulse {
                      0%, 100% { box-shadow: 0 0 0 1px rgba(29,181,132,0.3), 0 0 14px rgba(29,181,132,0.12); }
                      50%       { box-shadow: 0 0 0 1px rgba(29,181,132,0.6), 0 0 26px rgba(29,181,132,0.28); }
                    }
                    .btn-qualifier-cta { animation: teal-glow-pulse 2.8s ease-in-out infinite; transition: transform 180ms ease, box-shadow 180ms ease; }
                    .btn-qualifier-cta:hover { transform: translateY(-2px); box-shadow: 0 0 0 1px rgba(29,181,132,0.75), 0 0 32px rgba(29,181,132,0.38) !important; animation: none; }
                  `}</style>
                  <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.52)', marginBottom: 8, fontStyle: 'italic' }}>
                      {displayVerdict === 'declined'
                        ? 'See what changes would help you qualify.'
                        : 'Understand exactly what drives your qualification.'}
                    </p>
                    <button
                      onClick={() => document.getElementById('expert-analysis')?.scrollIntoView({ behavior: 'smooth' })}
                      onMouseEnter={() => setAiCtaHovered(true)}
                      onMouseLeave={() => setAiCtaHovered(false)}
                      className="btn-qualifier-cta w-full font-bold overflow-hidden"
                      style={{ position: 'relative', background: '#060F1A', color: '#ffffff', borderRadius: 8, height: 40, fontSize: '13px', border: '1px solid rgba(29,181,132,0.3)' }}
                    >
                      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', opacity: aiCtaHovered ? 0 : 1, transition: 'opacity 200ms ease', pointerEvents: 'none' }}>
                        {ctaDefaultText}
                      </span>
                      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', opacity: aiCtaHovered ? 1 : 0, transition: 'opacity 200ms ease', pointerEvents: 'none' }}>
                        Unlock AI Qualifier Analysis ↓
                      </span>
                    </button>
                  </div>

                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center py-12">
                  <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px', textAlign: 'center', lineHeight: 1.7 }}>
                    Enter your income &amp; details<br />to see your qualification.
                  </p>
                </div>
              )}
            </div>
          </div>{/* end Results Card */}

        </div>{/* end Block A */}

        {/* ── Block B: Qualification Snapshot + Affordability Ratios ─────── */}
        {results && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Left: Qualification Snapshot */}
            <div style={cardStyle} className="p-5 md:p-6 flex flex-col gap-4">

              {/* Header */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                  Borrowing Capacity
                </p>
                <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>Qualification Snapshot</p>
              </div>

              {/* Hero: Max Home Price */}
              <div className="pb-4" style={{ borderBottom: '1px solid #F1F4F7' }}>
                <p className="text-xs mb-1.5" style={{ color: '#9BA8B5' }}>Maximum Home Price</p>
                <p className="font-extrabold leading-none" style={{ color: '#0D1B2A', fontSize: '32px', letterSpacing: '-1.5px' }}>
                  {fmt(results.maxHomePrice)}
                </p>
              </div>

              {/* Donut + legend — V2 divider-row style */}
              <div className="flex flex-col md:flex-row items-center gap-4 md:gap-5">
                <div className="shrink-0">
                  <DonutChart
                    slices={snapshotSlices}
                    className="w-52 h-52"
                    centerValue={fmt(results.maxMortgage)}
                    centerLabel="max mortgage"
                  />
                </div>
                <div className="w-full md:flex-1 divide-y" style={{ borderColor: 'rgba(15,41,66,0.07)' }}>
                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#1DB584' }} />
                      <span style={{ color: '#4B5563', fontSize: '12.5px' }}>Max Mortgage</span>
                    </div>
                    <span className="font-semibold" style={{ color: '#0D1B2A', fontSize: '12.5px' }}>
                      {fmt(results.maxMortgage)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#F59E0B' }} />
                      <span style={{ color: '#4B5563', fontSize: '12.5px' }}>Down Payment</span>
                    </div>
                    <span className="font-semibold" style={{ color: '#0D1B2A', fontSize: '12.5px' }}>
                      {fmt(parseFloat(form.downPayment) || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'rgba(29,181,132,0.35)' }} />
                      <span style={{ color: '#4B5563', fontSize: '12.5px' }}>Est. Monthly P&amp;I</span>
                    </div>
                    <span className="font-semibold" style={{ color: '#1DB584', fontSize: '12.5px' }}>
                      {fmtx(results.monthlyPI)}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right: Affordability Ratios */}
            <div style={cardStyle} className="p-5 md:p-6 flex flex-col gap-5">
              <div>
                <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>Qualifying Ratios at Maximum Budget</p>
                <p className="text-xs" style={{ color: '#9BA8B5' }}>
                  {isCA ? 'GDS & TDS vs OSFI limits at your maximum qualifying price (B-20 stress test applied)' : 'Front-end & back-end ratios at your estimated maximum purchase price (28/36 rule)'}
                </p>
              </div>

              <RatioRow
                label={isCA ? 'GDS — Gross Debt Service' : 'Front-End Ratio'}
                ratio={results.gdsRatio}
                limit={results.gdsLimit}
                components={isCA
                  ? ['Principal & Interest', 'Property Tax', 'Heating & Condo Fees']
                  : ['Principal & Interest', 'Property Tax', 'Heating']}
              />

              <div style={{ borderTop: '1px solid #F1F4F7', paddingTop: 4 }}>
                <RatioRow
                  label={isCA ? 'TDS — Total Debt Service' : 'Back-End Ratio'}
                  ratio={results.tdsRatio}
                  limit={results.tdsLimit}
                  components={isCA
                    ? ['All GDS components', 'Car / Vehicle Payments', 'Credit Card Minimums', 'Other Loan Payments']
                    : ['All front-end components', 'Car / Vehicle Payments', 'Credit Card Minimums', 'Other Monthly Debts']}
                />
              </div>

              <p className="text-xs leading-relaxed" style={{ color: '#9BA8B5', borderTop: '1px solid #F1F4F7', paddingTop: 12 }}>
                Ratios are calculated at your maximum qualifying price. At a lower purchase price, your ratios improve proportionally.
              </p>
            </div>

          </div>
        )}{/* end Block B */}

        {/* ── Block C: AI Qualifier Analysis ───────────────────────────────── */}
        {results && vc && (
          <div id="expert-analysis" className="rounded-2xl overflow-hidden shadow-sm scroll-mt-[78px] md:scroll-mt-[88px]">

            {/* ── Header ── */}
            <div
              className="px-4 md:px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center"
              style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #0f2744 100%)', paddingTop: 16, paddingBottom: 16, gap: 12 }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(29,181,132,0.18)' }}
                >
                  <Sparkles className="w-4 h-4" style={{ color: '#1DB584' }} aria-hidden="true" />
                </span>
                <p className="text-white text-lg md:text-xl font-bold tracking-tight">FinCalc <span style={{ color: '#1DB584' }}>Smart</span> AI Qualifier Analysis</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleDownloadPDF}
                  disabled={!results || pdfLoading}
                  aria-disabled={!results || pdfLoading}
                  title={!results ? 'Calculate first to generate a report' : 'Download PDF report'}
                  className="inline-flex items-center gap-1.5"
                  style={{
                    background: '#1DB584', color: '#ffffff', borderRadius: 9999,
                    padding: '7px 16px', fontSize: '13px', fontWeight: 700,
                    opacity: (!results || pdfLoading) ? 0.65 : 1,
                    cursor: (!results || pdfLoading) ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  {pdfLoading ? 'Generating…' : 'Download PDF'}
                </button>
                <button
                  disabled
                  aria-disabled="true"
                  title="Coming soon"
                  className="inline-flex items-center gap-1.5 cursor-not-allowed select-none"
                  style={{ border: '1.5px solid rgba(255,255,255,0.30)', color: 'rgba(255,255,255,0.78)', background: 'rgba(255,255,255,0.06)', borderRadius: 9999, padding: '7px 16px', fontSize: '13px', fontWeight: 700 }}
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  Email Results
                </button>
              </div>
            </div>

            {/* ── Body ── */}
            <div className="p-4 md:p-5" style={{ background: '#f4f6f9' }}>

              {/* ── Row 1: Verdict + Key Results ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                {/* LEFT — Qualification Verdict (white) */}
                <div className="rounded-2xl p-4 md:p-5 flex flex-col gap-3"
                  style={{ background: '#ffffff', border: `1px solid ${vc.lightBorder}`, borderLeft: `4px solid ${vc.color}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>

                  <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: vc.color }}>
                    Qualification Verdict
                  </p>

                  <div className="flex items-center gap-3">
                    {/* Outer light-tinted square → inner solid circle → white icon */}
                    <div style={{ width: 84, height: 84, borderRadius: 22, background: vc.lightBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ width: 62, height: 62, borderRadius: '50%', background: vc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${vc.color}55` }}>
                        {displayVerdict === 'approved'   && <Check         style={{ width: 30, height: 30, color: '#ffffff' }} strokeWidth={2.5} aria-hidden="true" />}
                        {displayVerdict === 'borderline' && <AlertTriangle style={{ width: 28, height: 28, color: '#ffffff' }} strokeWidth={2}   aria-hidden="true" />}
                        {displayVerdict === 'declined'   && <X             style={{ width: 30, height: 30, color: '#ffffff' }} strokeWidth={2.5} aria-hidden="true" />}
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize: 26, fontWeight: 800, color: vc.color, lineHeight: 1.05, letterSpacing: '-0.5px' }}>
                        {displayVerdict === 'approved' ? 'Qualifies' : displayVerdict === 'borderline' ? 'Borderline' : 'Does Not Qualify'}
                      </p>
                      <p className="text-xs font-semibold mt-0.5" style={{ color: '#6B7A8D' }}>
                        {displayVerdict === 'approved'
                          ? (isCA ? 'GDS & TDS pass OSFI B-20' : '28/36 Rule — both ratios pass')
                          : displayVerdict === 'borderline'
                          ? (isCA ? 'Near GDS or TDS limit' : 'Near 28% or 36% threshold')
                          : (isCA ? 'GDS or TDS exceeds OSFI limits' : 'Front-end or back-end exceeded')}
                      </p>
                    </div>
                  </div>

                  {/* Ratio chips */}
                  <div className="flex gap-2 flex-wrap">
                    {(() => {
                      const gs = ratioStateOf(results.gdsRatio, results.gdsLimit);
                      const ts = ratioStateOf(results.tdsRatio, results.tdsLimit);
                      return (
                        <>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                            style={{ background: RATIO_COLORS[gs].lightBg, color: RATIO_COLORS[gs].lightText }}>
                            {isCA ? 'GDS' : 'Front-end'} {results.gdsRatio.toFixed(1)}% / {results.gdsLimit}% — {RATIO_COLORS[gs].badgeTxt}
                          </span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                            style={{ background: RATIO_COLORS[ts].lightBg, color: RATIO_COLORS[ts].lightText }}>
                            {isCA ? 'TDS' : 'Back-end'} {results.tdsRatio.toFixed(1)}% / {results.tdsLimit}% — {RATIO_COLORS[ts].badgeTxt}
                          </span>
                        </>
                      );
                    })()}
                  </div>

                  {/* Verdict supporting message */}
                  <div style={{ borderTop: '1px solid #F1F4F7', paddingTop: 10 }}>
                    <p className="text-sm font-semibold mb-1" style={{ color: '#0D1B2A' }}>
                      {displayVerdict === 'approved'   && 'Good news — you qualify for this purchase.'}
                      {displayVerdict === 'borderline' && "You're close — a few adjustments could move you into approval."}
                      {displayVerdict === 'declined'   && 'Not there yet — reducing monthly debt or increasing income will have the most impact.'}
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: '#6B7A8D' }}>
                      {displayVerdict === 'approved' &&
                        `Your income and debt profile meet ${isCA ? 'OSFI B-20 GDS and TDS' : '28/36 rule front-end and back-end'} thresholds. You have borrowing room at your current figures.`}
                      {displayVerdict === 'borderline' && (() => {
                        const limitName = !displayGdsPass
                          ? `${isCA ? 'GDS' : 'front-end'} ratio (${results.gdsRatio.toFixed(1)}% vs ${results.gdsLimit}% limit)`
                          : `${isCA ? 'TDS' : 'back-end'} ratio (${results.tdsRatio.toFixed(1)}% vs ${results.tdsLimit}% limit)`;
                        return `Your ${limitName} is near the edge. Reducing debts, increasing your down payment, or adding a co-borrower may be enough.`;
                      })()}
                      {displayVerdict === 'declined' && (() => {
                        const issues: string[] = [];
                        if (!displayGdsPass) issues.push(`${isCA ? 'GDS' : 'front-end'} at ${results.gdsRatio.toFixed(1)}% (limit ${results.gdsLimit}%)`);
                        if (!displayTdsPass) issues.push(`${isCA ? 'TDS' : 'back-end'} at ${results.tdsRatio.toFixed(1)}% (limit ${results.tdsLimit}%)`);
                        return `${issues.join(' and ')} exceed${issues.length === 1 ? 's' : ''} lender limits. See the Qualifying Power card below for the numbers.`;
                      })()}
                    </p>
                  </div>
                </div>

                {/* RIGHT — Smart Optimization Found */}
                {(() => {
                  // Determine best lever: debt reduction > income increase > rate sensitivity
                  const hasDebts = results.totalMonthlyDebts > 0;
                  const debtGain = hasDebts && annuityFactor > 0
                    ? results.totalMonthlyDebts * annuityFactor
                    : 0;
                  // Income lever: +$10k/yr adds ~(10000/12)*(tdsLimit/100)*annuityFactor to max mortgage
                  const incomeGain = annuityFactor > 0
                    ? Math.round((10000 / 12) * (results.tdsLimit / 100) * annuityFactor / 100) * 100
                    : 0;

                  const showDebtLever = hasDebts && debtGain > 0;
                  const leverAction   = showDebtLever
                    ? `Reduce or eliminate ${fmtx(results.totalMonthlyDebts)}/mo in monthly debt`
                    : `Add $10,000/yr household income`;
                  const leverGainFmt  = showDebtLever ? fmt(debtGain) : fmt(incomeGain);
                  const leverDetail   = showDebtLever
                    ? `Lower monthly debt obligations can free up back-end ratio capacity and increase your estimated qualification amount.`
                    : `Additional qualifying income can expand borrowing capacity by increasing available ${isCA ? 'GDS/TDS' : 'front-end/back-end'} room.`;

                  return (
                    <div className="rounded-2xl p-4 md:p-5 flex flex-col gap-3"
                      style={{ background: 'linear-gradient(145deg, #0D1B2A 0%, #0c1e3a 100%)', border: '1px solid rgba(29,181,132,0.14)', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>

                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" />
                        <span className="text-sm font-bold" style={{ color: '#1DB584' }}>Smart Optimization Found</span>
                      </div>

                      {results.maxMortgage > 0 ? (
                        <>
                          {/* Gain callout */}
                          <div className="rounded-xl px-4 py-4"
                            style={{ background: 'rgba(29,181,132,0.10)', border: '1px solid rgba(29,181,132,0.22)' }}>
                            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(29,181,132,0.7)', marginBottom: 6 }}>
                              Top Lever
                            </p>
                            <p className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(1.6rem, 4vw, 2.1rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                              {leverGainFmt}
                            </p>
                            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', marginTop: 6 }}>
                              potential extra qualifying budget
                            </p>
                          </div>

                          {/* Action + Detail */}
                          <div className="rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <p className="text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.85)' }}>
                              {leverAction}
                            </p>
                            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                              {leverDetail}
                            </p>
                          </div>

                          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', fontStyle: 'italic', lineHeight: 1.5 }}>
                            Estimate based on current inputs — actual lender results may vary.
                          </p>
                        </>
                      ) : (
                        <div className="rounded-xl px-4 py-4"
                          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                            No mortgage qualifies at the current inputs. Try increasing income, reducing debts, lowering housing costs, or testing a lower purchase target.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>{/* end Row 1 */}

              {/* ── Row 2: Compact Insight Cards ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">

                {/* Card 1: What's Limiting You */}
                {(() => {
                  // Determine the primary constraint for an actionable message
                  const gdsOver  = !displayGdsPass;
                  const tdsOver  = !displayTdsPass;
                  const hasDebts = results.totalMonthlyDebts > 0;

                  let limitTitle: string;
                  let limitBody: string;
                  let cardBg: string = vc.lightBg;
                  let cardBorder: string = vc.lightBorder;
                  let labelColor: string = vc.color;

                  if (!gdsOver && !tdsOver) {
                    // Both pass — identify the softer constraint
                    if (hasDebts) {
                      limitTitle = 'Monthly debts are your main drag';
                      limitBody  = `Your ${fmtx(results.totalMonthlyDebts)}/mo in obligations reduce TDS headroom. Eliminating them could meaningfully increase your qualifying budget.`;
                    } else {
                      limitTitle = 'Income & housing are balanced';
                      limitBody  = `No single factor is constraining you. Both ${isCA ? 'GDS' : 'front-end'} (${results.gdsRatio.toFixed(1)}%) and ${isCA ? 'TDS' : 'back-end'} (${results.tdsRatio.toFixed(1)}%) clear lender limits.`;
                    }
                    cardBg = '#ECFDF5'; cardBorder = '#A7F3D0'; labelColor = '#059669';
                  } else if (tdsOver && hasDebts) {
                    limitTitle = 'Monthly debt obligations are the binding limit';
                    limitBody  = `Your ${isCA ? 'TDS' : 'back-end'} is ${results.tdsRatio.toFixed(1)}% vs the ${results.tdsLimit}% limit. The ${fmtx(results.totalMonthlyDebts)}/mo in non-housing debts are consuming the remaining qualifying room.`;
                    cardBg = '#FEF2F2'; cardBorder = '#FECACA'; labelColor = '#DC2626';
                  } else if (gdsOver && !tdsOver) {
                    limitTitle = 'Housing cost ratio is the binding limit';
                    limitBody  = `Your ${isCA ? 'GDS' : 'front-end'} is ${results.gdsRatio.toFixed(1)}% vs the ${results.gdsLimit}% limit. Property tax and heating are consuming a large share of your qualifying income, leaving limited room for principal & interest.`;
                    cardBg = '#FEF2F2'; cardBorder = '#FECACA'; labelColor = '#DC2626';
                  } else if (tdsOver && !gdsOver) {
                    limitTitle = `${isCA ? 'TDS' : 'Back-end'} ratio is the binding limit`;
                    limitBody  = `Your ${isCA ? 'TDS' : 'back-end'} is ${results.tdsRatio.toFixed(1)}% vs the ${results.tdsLimit}% limit. ${hasDebts ? `Monthly debts (${fmtx(results.totalMonthlyDebts)}/mo) are pushing it over.` : 'Income relative to total housing costs is the constraint.'}`;
                    cardBg = '#FEF2F2'; cardBorder = '#FECACA'; labelColor = '#DC2626';
                  } else {
                    limitTitle = 'Both ratios exceed limits';
                    limitBody  = `${isCA ? 'GDS' : 'Front-end'} ${results.gdsRatio.toFixed(1)}% and ${isCA ? 'TDS' : 'back-end'} ${results.tdsRatio.toFixed(1)}% both exceed lender thresholds. Increasing income and reducing debts will have the most combined impact.`;
                    cardBg = '#FEF2F2'; cardBorder = '#FECACA'; labelColor = '#DC2626';
                  }

                  return (
                    <div className="rounded-xl p-4" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="flex items-center justify-center shrink-0"
                          style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.7)', border: `1px solid ${cardBorder}` }}>
                          <Activity className="w-3.5 h-3.5" style={{ color: labelColor }} aria-hidden="true" />
                        </span>
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: labelColor }}>What&apos;s Limiting You</p>
                      </div>
                      <p className="text-sm font-semibold mb-1" style={{ color: '#0D1B2A' }}>{limitTitle}</p>
                      <p className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>{limitBody}</p>
                    </div>
                  );
                })()}

                {/* Card 2: Qualifying Power */}
                <div className="rounded-xl p-4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center shrink-0"
                      style={{ width: 28, height: 28, borderRadius: 8, background: '#e0f2fe' }}>
                      <TrendingUp className="w-3.5 h-3.5 text-sky-600" aria-hidden="true" />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-sky-600">Qualifying Power</p>
                  </div>
                  {annuityFactor > 0 ? (
                    <>
                      <p className="text-sm font-semibold mb-1" style={{ color: '#0D1B2A' }}>
                        +{fmt(100 * annuityFactor)} per {fmtx(100)}/mo debt cut
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>
                        {results.totalMonthlyDebts > 0
                          ? `Eliminating ${fmtx(results.totalMonthlyDebts)}/mo in debts could add ~${fmt(results.totalMonthlyDebts * annuityFactor)} to your qualifying amount.`
                          : 'No current debts — full qualifying power applied to your income.'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold mb-1" style={{ color: '#0D1B2A' }}>Qualifying capacity exhausted</p>
                      <p className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>
                        {results.totalMonthlyDebts > 0
                          ? `${fmtx(results.totalMonthlyDebts)}/mo in debts consumed all qualifying room. Reducing debts directly restores borrowing capacity.`
                          : 'Housing costs alone exceed qualifying capacity. Increase income or reduce expenses.'}
                      </p>
                    </>
                  )}
                </div>

                {/* Card 3: B-20 Stress Test (CA) / Rate Sensitivity (US) */}
                {isCA ? (
                  <div className="rounded-xl p-4" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex items-center justify-center shrink-0"
                        style={{ width: 28, height: 28, borderRadius: 8, background: '#FEF3C7' }}>
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                      </span>
                      <p className="text-xs font-bold uppercase tracking-widest text-amber-600">B-20 Stress Test</p>
                    </div>
                    <p className="text-sm font-semibold mb-1" style={{ color: '#0D1B2A' }}>
                      Qualifying at {stressRateDisplay}% — not {parseFloat(form.annualRate).toFixed(2)}%
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>
                      OSFI mandates contract rate + 2% for qualification. Protects against rate increases at renewal.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl p-4" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex items-center justify-center shrink-0"
                        style={{ width: 28, height: 28, borderRadius: 8, background: '#FEF3C7' }}>
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                      </span>
                      <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Rate Sensitivity</p>
                    </div>
                    <p className="text-sm font-semibold mb-1" style={{ color: '#0D1B2A' }}>
                      +1% rate ≈ 8–10% less qualifying power
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>
                      At {parseFloat(form.annualRate).toFixed(2)}%, each 1% increase meaningfully reduces qualifying power. A fixed rate locks in your qualification basis.
                    </p>
                  </div>
                )}

              </div>{/* end Row 2 */}

              {/* ── Row 3: Income & Capacity Breakdown ── */}
              <style>{`
                .qc-stat-grid > div { border-right: 1px solid #F1F4F7; border-bottom: 1px solid #F1F4F7; }
                .qc-stat-grid > div:nth-child(even) { border-right: none; }
                .qc-stat-grid > div:nth-child(n+3) { border-bottom: none; }
                @media (min-width: 768px) {
                  .qc-stat-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
                  .qc-stat-grid > div { border-bottom: none; border-right: 1px solid #F1F4F7; }
                  .qc-stat-grid > div:last-child { border-right: none; }
                }
              `}</style>
              <div className="rounded-2xl overflow-hidden"
                style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                <div style={{ background: '#F8FAFB', borderBottom: '1px solid rgba(15,41,66,0.09)', padding: '9px 16px' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9BA8B5', letterSpacing: '0.12em' }}>
                    Income &amp; Capacity Breakdown
                  </p>
                </div>
                <div className="qc-stat-grid grid grid-cols-2">
                  <div className="px-5 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#9BA8B5' }}>Monthly Income</p>
                    <p style={{ fontSize: 17, fontWeight: 700, color: '#0D1B2A', letterSpacing: '-0.5px' }}>{fmtx(results.monthlyIncome)}</p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#9BA8B5' }}>Monthly Debts</p>
                    <p style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.5px', color: results.totalMonthlyDebts > 0 ? '#EF4444' : '#10B981' }}>
                      {results.totalMonthlyDebts > 0 ? fmtx(results.totalMonthlyDebts) : 'None'}
                    </p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#9BA8B5' }}>Max P&amp;I Capacity</p>
                    <p style={{ fontSize: 17, fontWeight: 700, color: '#1DB584', letterSpacing: '-0.5px' }}>{fmtx(results.maxMonthlyPayment)}</p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#9BA8B5' }}>
                      {isCA ? 'TDS Headroom' : 'Back-end Headroom'}
                    </p>
                    {(() => {
                      const headroom = results.tdsLimit - results.tdsRatio;
                      const isOver = headroom < 0;
                      const atLimit = !isOver && Math.abs(headroom) < 0.05;
                      const color = isOver ? '#EF4444' : atLimit ? '#F59E0B' : headroom < 5 ? '#F59E0B' : '#1DB584';
                      const label = isOver
                        ? `${Math.abs(headroom).toFixed(1)}pp over limit`
                        : atLimit
                        ? 'At limit'
                        : `${headroom.toFixed(1)}pp left`;
                      return (
                        <p style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.5px', color }}>
                          {label}
                        </p>
                      );
                    })()}
                  </div>
                </div>
              </div>

            </div>{/* end body */}

            {/* ── Footer Disclaimer ── */}
            <div className="flex items-start gap-2.5 px-5 md:px-6 py-4"
              style={{ borderTop: '1px solid rgba(15,41,66,0.07)', background: '#f8fafb' }}>
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden="true" />
              <p className="text-slate-400 text-xs leading-relaxed">
                <strong className="text-slate-500 font-semibold">Disclaimer:</strong> This analysis is for illustrative purposes only and does not constitute financial, tax, or mortgage advice. Individual results will vary based on lender terms, credit profile, and market conditions. Consult a licensed mortgage professional before making financial decisions.
              </p>
            </div>

          </div>
        )}{/* end Block C */}

        {/* ── Block F: How It Works ── */}
        {formulaContent && (
          <div style={cardStyle} className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" />
              How It Works
            </h2>
            <div className="space-y-4 text-sm md:text-base text-slate-600 leading-relaxed">
              {formulaContent}
            </div>
          </div>
        )}

        {/* ── Block G: FAQ ── */}
        {faqItems.length > 0 && (
          <div style={cardStyle} className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
              <HelpCircle className="w-5 h-5 shrink-0" style={{ color: '#1DB584' }} aria-hidden="true" />
              Frequently Asked Questions
            </h2>
            <CalculatorFaqAccordion faqs={faqItems} />
          </div>
        )}

        {/* ── Disclaimer ── */}
        <Disclaimer />

    </div>
  );
}
