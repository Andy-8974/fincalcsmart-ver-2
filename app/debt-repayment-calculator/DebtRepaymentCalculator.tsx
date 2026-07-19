'use client';

// ─────────────────────────────────────────────────────────────────────────────
// DebtRepaymentCalculator
//
// Phase 1 — Math / Types / Defaults    ✓ complete
// Phase 2 — page.tsx V2 shell          ✓ complete (separate file)
// Phase 3 — Input card + Results card  ← this phase
// Phase 4 — Payoff timeline chart      (pending)
// Phase 5 — AI Analysis panel          (pending)
// Phase 6 — How It Works / FAQ / Disclaimer (pending)
//
// Regional currency (CA$ / $) switches via useRegion().
// Core debt math is identical for US and CA — monthly compounding only.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useMemo, type ReactNode } from 'react';
import { useRegion } from '@/lib/region/context';
import { NumericInput, Tooltip, DonutChart, type PieSlice } from '../_mortgage-shared/ui';
import { fmtCAD, fmtCADx, fmtUSD, fmtUSDx } from '../_mortgage-shared/math';
import MobileCalcCTA from '@/components/ui/MobileCalcCTA';
import CalculatorFaqAccordion from '@/components/layout/CalculatorFaqAccordion';
import {
  Activity, AlertTriangle, BarChart2, BookOpen, Calendar, CreditCard,
  DollarSign, Download, HelpCircle, Mail, ShieldAlert, Sparkles, TrendingUp, Zap,
} from 'lucide-react';
import { buildDebtRepaymentPDF } from '@/lib/pdf/adapters/debtRepaymentAdapter';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FormState {
  balance: string;
  annualRate: string;
  annualFees: string;
  monthlyPayment: string;
  extraPayment: string;
}

/**
 * Three-state result union — drives all UI branching.
 *
 * 'empty'           → balance or payment is 0 / blank → render placeholder
 * 'payment-too-low' → payment ≤ monthly interest     → named error card
 * 'ok'              → valid inputs, all fields populated
 */
export type CalcResult =
  | { status: 'empty' }
  | {
      status: 'payment-too-low';
      /** Monthly interest accruing on the opening balance: r × balance */
      monthlyInterest: number;
      /** Smallest payment (rounded up to the cent) that reduces principal */
      minViablePayment: number;
    }
  | {
      status: 'ok';

      // ── Baseline: current payment, no extra ─────────────────────────────
      /** Full months until balance reaches $0 (exact simulation) */
      months: number;
      /** Calendar string, e.g. "June 2028" */
      debtFreeStr: string;
      /** Sum of all interest charges across every payment */
      totalInterest: number;
      /** Sum of all payments made (last payment may be partial) */
      totalPaid: number;
      /** Interest charged in month 1: r × opening balance */
      monthlyInterestCharge: number;
      /** Principal reduced in month 1: payment − monthlyInterestCharge */
      principalPerPayment: number;

      // ── Fixed +$100/month comparison (always computed when status = 'ok') ─
      accel100Months: number;
      accel100DebtFreeStr: string;
      accel100TotalInterest: number;
      /** Interest saved vs baseline by adding $100/month */
      accel100InterestSaved: number;
      /** Months saved vs baseline by adding $100/month */
      accel100MonthsSaved: number;

      // ── User-supplied extra payment (null when extraPayment = 0) ─────────
      accelMonths: number | null;
      accelDebtFreeStr: string | null;
      accelTotalInterest: number | null;
      accelInterestSaved: number | null;
      accelMonthsSaved: number | null;

      // ── Annual fees (display only — does not affect amortisation) ────────
      /** Annual card/lender fee entered by user */
      annualFees: number;
      /** Total fees across all years of repayment: annualFees × ⌈months/12⌉ */
      totalFees: number;

      // ── Echoed inputs (AI Analysis reads these directly) ──────────────────
      balance: number;
      annualRate: number;
      payment: number;
      extraPayment: number;
    };

// ─── Defaults ─────────────────────────────────────────────────────────────────
//
// $5,000 at 19.99% paying $150/month → ~50 months, ~$2,357 interest → Watch status.
// extraPayment = 0 so the +$100 opportunity card fires on default load.

export const DEFAULTS: FormState = {
  balance: '5000',
  annualRate: '19.99',
  annualFees: '0',
  monthlyPayment: '150',
  extraPayment: '0',
};

// ─── Math helpers ─────────────────────────────────────────────────────────────

/**
 * Monthly interest rate for personal debt.
 * Simple monthly compounding — identical formula for US and CA.
 * The Canadian Interest Act semi-annual rule applies to mortgages ONLY.
 */
export function debtMonthlyRate(annualPct: number): number {
  return annualPct / 1200;
}

/**
 * Exact amortisation simulation with correct final partial payment.
 * Safety cap: 1,200 months (100 years).
 */
export function calcExactPayoff(
  balance: number,
  r: number,
  payment: number,
): { months: number; totalInterest: number; totalPaid: number } {
  if (balance <= 0) {
    return { months: 0, totalInterest: 0, totalPaid: 0 };
  }
  if (payment <= 0 || (r > 0 && payment <= r * balance)) {
    return { months: Infinity, totalInterest: Infinity, totalPaid: Infinity };
  }

  let bal = balance;
  let months = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  const MAX_MONTHS = 1200;

  while (bal > 0.005 && months < MAX_MONTHS) {
    months++;
    const interestCharge = bal * r;
    const actualPayment = Math.min(payment, bal + interestCharge);
    const principalPaid = actualPayment - interestCharge;
    totalInterest += interestCharge;
    totalPaid += actualPayment;
    bal = Math.max(0, bal - principalPaid);
  }

  return { months, totalInterest, totalPaid };
}

/**
 * Returns "June 2028" style string for a payoff date.
 * Client-side only — safe inside useMemo on a 'use client' component.
 */
export function debtFreeDate(monthsFromNow: number): string {
  if (!Number.isFinite(monthsFromNow) || monthsFromNow <= 0) return '';
  const d = new Date();
  d.setMonth(d.getMonth() + monthsFromNow);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Monetary render guard — prevents NaN / Infinity / negatives reaching formatters.
 * Apply before every fmtCAD / fmtUSD call: fmtCAD(safe(n))
 */
export function safe(n: number): number {
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Derives a CalcResult from raw FormState strings.
 * No side effects — suitable for useMemo.
 */
export function computeResult(form: FormState): CalcResult {
  const balance = parseFloat(form.balance) || 0;
  const annualRate = Math.max(0, Math.min(99.9, parseFloat(form.annualRate) || 0));
  // Annual fees: display-only addition — not included in amortisation simulation.
  // Total fees = annualFees × number of full or partial years of repayment.
  const annualFees = Math.max(0, parseFloat(form.annualFees) || 0);
  const payment = parseFloat(form.monthlyPayment) || 0;
  const extra = Math.max(0, parseFloat(form.extraPayment) || 0);

  if (balance <= 0 || payment <= 0) {
    return { status: 'empty' };
  }

  const r = debtMonthlyRate(annualRate);
  const monthlyInterest = r * balance;

  if (payment <= monthlyInterest) {
    const minViablePayment = Math.ceil(monthlyInterest * 100 + 1) / 100;
    return { status: 'payment-too-low', monthlyInterest, minViablePayment };
  }

  const base = calcExactPayoff(balance, r, payment);
  const accel100 = calcExactPayoff(balance, r, payment + 100);

  let accelMonths: number | null = null;
  let accelDebtFreeStr: string | null = null;
  let accelTotalInterest: number | null = null;
  let accelInterestSaved: number | null = null;
  let accelMonthsSaved: number | null = null;

  if (extra > 0) {
    const accel = calcExactPayoff(balance, r, payment + extra);
    if (Number.isFinite(accel.months)) {
      accelMonths = accel.months;
      accelDebtFreeStr = debtFreeDate(accel.months);
      accelTotalInterest = accel.totalInterest;
      accelInterestSaved = Math.max(0, base.totalInterest - accel.totalInterest);
      accelMonthsSaved = Math.max(0, base.months - accel.months);
    }
  }

  return {
    status: 'ok',
    months: base.months,
    debtFreeStr: debtFreeDate(base.months),
    totalInterest: base.totalInterest,
    totalPaid: base.totalPaid,
    monthlyInterestCharge: monthlyInterest,
    principalPerPayment: Math.max(0, payment - monthlyInterest),
    accel100Months: accel100.months,
    accel100DebtFreeStr: debtFreeDate(accel100.months),
    accel100TotalInterest: accel100.totalInterest,
    accel100InterestSaved: Math.max(0, base.totalInterest - accel100.totalInterest),
    accel100MonthsSaved: Math.max(0, base.months - accel100.months),
    accelMonths,
    accelDebtFreeStr,
    accelTotalInterest,
    accelInterestSaved,
    accelMonthsSaved,
    annualFees,
    totalFees: annualFees > 0 ? annualFees * Math.ceil(base.months / 12) : 0,
    balance,
    annualRate,
    payment,
    extraPayment: extra,
  };
}

// ─── Chart helpers ────────────────────────────────────────────────────────────
//
// Inline SVG — no chart library. Pattern follows DonutChart in _mortgage-shared/ui.tsx.
// PAD values leave room for end-dots; Y_FLOOR is the SVG y-coordinate of a $0 balance.

const SVG_W = 560;
const SVG_H = 272;
const PAD_L = 42;   // space for y-axis balance labels
const PAD_R = 12;
const PAD_T = 76;   // space for large callout box above chart lines
const PAD_B = 30;   // space for x-axis year labels
const CW = SVG_W - PAD_L - PAD_R; // 506
const CH = SVG_H - PAD_T - PAD_B; // 166
const Y_FLOOR = PAD_T + CH;        // 242

/**
 * Returns an array of opening-balance values for each month.
 * Index 0 = opening balance; index n = balance after n payments.
 * Stops when balance reaches $0 or capMonths is exceeded.
 */
function buildChartSchedule(
  balance: number,
  r: number,
  payment: number,
  capMonths: number,
): number[] {
  const out: number[] = [balance];
  let bal = balance;
  let m = 0;
  while (bal > 0.005 && m < capMonths) {
    m++;
    const interest = bal * r;
    const actual = Math.min(payment, bal + interest);
    bal = Math.max(0, bal - (actual - interest));
    out.push(bal);
  }
  return out;
}

/**
 * Converts a balance schedule to SVG polyline points and area fill path.
 * Both base and accel lines use baseMonths as the shared x-axis scale so
 * they are directly comparable on the same chart.
 * Returns null when any coordinate is non-finite or inputs are invalid.
 */
function buildLinePaths(
  schedule: number[],
  openingBalance: number,
  baseMonths: number,
): { points: string; areaPath: string } | null {
  if (openingBalance <= 0 || schedule.length < 2 || baseMonths <= 0) return null;
  const pts: string[] = [];
  for (let i = 0; i < schedule.length; i++) {
    const x = PAD_L + (i / baseMonths) * CW;
    const y = PAD_T + CH - (schedule[i] / openingBalance) * CH;
    if (!isFinite(x) || !isFinite(y)) return null;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const firstY = pts[0].split(',')[1];
  const lastX = (PAD_L + ((schedule.length - 1) / baseMonths) * CW).toFixed(1);
  const areaPath = `M${PAD_L.toFixed(1)},${firstY} ${pts.join(' ')} L${lastX},${Y_FLOOR} L${PAD_L.toFixed(1)},${Y_FLOOR} Z`;
  return { points: pts.join(' '), areaPath };
}

// ─── Component props ──────────────────────────────────────────────────────────

export interface DebtRepaymentCalculatorProps {
  formulaContent?: ReactNode;
  faqItems?: Array<{ question: string; answer: string }>;
}

// ─── Shared styles ────────────────────────────────────────────────────────────
// Locked V2 card style — copied from CanadaMortgageCalculator.tsx cardStyle const.

const cardStyle: React.CSSProperties = {
  border: '1px solid rgba(15,41,66,0.09)',
  borderRadius: '20px',
  background: '#ffffff',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 2px 10px rgba(0,0,0,0.03)',
};

// inputCls defined inline — keeps this file independent of CalculatorLayout import.
// String is identical to the CalculatorLayout.inputCls export.
const inputClsBase =
  'w-full rounded-brand-sm border-[1.5px] border-brand-gray-200 text-brand-navy bg-brand-gray-50 ' +
  'px-3 py-2.5 text-sm transition-colors duration-150 ' +
  'focus:outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/[0.15]';

const inputClsCompact = inputClsBase
  .replace('py-2.5', 'py-1 md:py-2')
  .replace('px-3', 'pr-2 md:pr-3 pl-3');

const navyLabelStyle: React.CSSProperties = {
  fontWeight: 700,
  color: '#0D1B2A',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  marginBottom: 4,
};
const navyLabelCls = 'text-[10px] md:text-xs';

// ─── Tooltips ─────────────────────────────────────────────────────────────────

const TOOLTIPS = {
  balance:
    'The current outstanding amount you owe on this debt. Check your most recent statement for the exact balance — use the payoff balance, not the original loan amount.',
  annualRate:
    'The annual interest rate charged on this debt. Credit cards in Canada and the USA typically charge 19.99%–29.99%. Personal loans are usually lower. Find this on your statement under "Annual Percentage Rate" or "APR".',
  annualFees:
    'Annual fees charged by your lender or card issuer — for example, a credit card annual fee or loan origination fee renewed yearly. These are shown in the cost breakdown so you can see the full cost of carrying this debt. Annual fees do not affect the repayment schedule calculation.',
  monthlyPayment:
    'The minimum fixed amount you plan to pay each month. Must be greater than the monthly interest charge to actually reduce your balance. A higher payment means a faster payoff and less total interest.',
  extraPayment:
    'Any additional amount on top of your regular payment. Goes directly to reducing your balance — the earlier you add extra payments, the greater the compound benefit on total interest saved.',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DebtRepaymentCalculator({
  formulaContent,
  faqItems = [],
}: DebtRepaymentCalculatorProps) {
  const { region } = useRegion();
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [aiCtaHovered, setAiCtaHovered] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const isCA = region === 'ca';
  const currencyPrefix = isCA ? 'CA$' : '$';
  const fmt = isCA ? fmtCAD : fmtUSD;
  const fmtx = isCA ? fmtCADx : fmtUSDx;

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const result = useMemo(() => computeResult(form), [form]);

  /** SVG chart data — recomputed only when result changes. */
  const chartData = useMemo(() => {
    if (result.status !== 'ok') return null;
    const r = debtMonthlyRate(result.annualRate);
    const baseSchedule = buildChartSchedule(result.balance, r, result.payment, result.months + 2);
    const basePaths = buildLinePaths(baseSchedule, result.balance, result.months);
    if (!basePaths) return null;
    // Use user's extra payment if supplied and valid; otherwise show fixed +$100 comparison.
    const hasUserExtra = result.extraPayment > 0 && result.accelMonths !== null;
    const accelMonths = (hasUserExtra && result.accelMonths !== null)
      ? result.accelMonths
      : result.accel100Months;
    const accelPayment = result.payment + (hasUserExtra ? result.extraPayment : 100);
    const accelSchedule = buildChartSchedule(result.balance, r, accelPayment, accelMonths + 2);
    const accelPaths = buildLinePaths(accelSchedule, result.balance, result.months);
    // Year markers: vertical guides at each 12-month interval, capped at 15 years
    const totalYears = result.months > 0 ? Math.floor(result.months / 12) : 0;
    const yearMarkers = Array.from({ length: Math.min(totalYears, 15) }, (_, i) => {
      const yr = i + 1;
      const x = PAD_L + (yr * 12 / result.months) * CW;
      return { yr, x };
    }).filter(({ x }) => x < PAD_L + CW - 12); // omit if too close to the right edge

    // Callout: months saved by the accel scenario (user extra or $100 default)
    const calloutMonthsSaved = hasUserExtra
      ? (result.accelMonthsSaved ?? 0)
      : result.accel100MonthsSaved;

    return {
      basePaths, accelPaths,
      accelEndMonth: accelMonths,
      baseEndMonth: result.months,
      hasUserExtra,
      yearMarkers,
      calloutMonthsSaved,
    };
  }, [result]);

  /**
   * AI Analysis data — extracted from result union to avoid IIFE type-narrowing issues.
   * Returns null when result is 'empty' (AI panel shows placeholder).
   * All ok-only fields are zero-defaulted in the payment-too-low branch so JSX can
   * reference them without discriminated-union narrowing.
   */
  const aiData = useMemo(() => {
    if (result.status === 'empty') return null;

    if (result.status === 'payment-too-low') {
      return {
        isPTL: true,
        statusLabel: 'Caution' as 'Healthy' | 'Watch' | 'Caution',
        statusColor: '#ef4444',
        statusBg: 'rgba(239,68,68,0.10)',
        monthlyInterest: result.monthlyInterest,
        minViablePayment: result.minViablePayment,
        // ok-only fields — zero-defaulted, never rendered in PTL branches
        months: 0, totalInterest: 0, balance: 0, payment: 0,
        principalPerPayment: 0, principalPct: 0, interestRatio: 0,
        extraPayment: 0, hasUserExtra: false,
        accel100InterestSaved: 0, accel100MonthsSaved: 0,
        accelInterestSaved: null as number | null,
        accelMonthsSaved: null as number | null,
        debtFreeStr: '',
      };
    }

    // status === 'ok'
    const r = result;
    const interestRatio = r.balance > 0 ? r.totalInterest / r.balance : 0;
    const hasUserExtra = r.extraPayment > 0 && r.accelMonths !== null;
    const statusLabel: 'Healthy' | 'Watch' | 'Caution' =
      r.months > 60 || interestRatio > 0.5 ? 'Caution'
      : r.months > 24 || interestRatio > 0.25 ? 'Watch'
      : 'Healthy';
    const statusColor = statusLabel === 'Healthy' ? '#1DB584' : statusLabel === 'Watch' ? '#f59e0b' : '#ef4444';
    const statusBg = statusLabel === 'Healthy' ? 'rgba(29,181,132,0.10)' : statusLabel === 'Watch' ? 'rgba(245,158,11,0.10)' : 'rgba(239,68,68,0.10)';

    return {
      isPTL: false,
      statusLabel, statusColor, statusBg,
      monthlyInterest: r.monthlyInterestCharge,
      minViablePayment: 0,
      months: r.months, totalInterest: r.totalInterest,
      balance: r.balance, payment: r.payment,
      principalPerPayment: r.principalPerPayment,
      principalPct: r.payment > 0 ? Math.round((r.principalPerPayment / r.payment) * 100) : 0,
      interestRatio, extraPayment: r.extraPayment, hasUserExtra,
      accel100InterestSaved: r.accel100InterestSaved,
      accel100MonthsSaved: r.accel100MonthsSaved,
      accelInterestSaved: r.accelInterestSaved,
      accelMonthsSaved: r.accelMonthsSaved,
      debtFreeStr: r.debtFreeStr,
    };
  }, [result]);

  /** Donut slices for Debt Breakdown card — principal, interest, fees (when > 0). */
  const donutSlices = useMemo((): PieSlice[] | null => {
    if (result.status !== 'ok') return null;
    const slices: PieSlice[] = [
      { label: 'Principal', value: safe(result.balance), color: '#1DB584', alwaysShow: true },
      { label: 'Total Interest', value: safe(result.totalInterest), color: '#F59E0B', alwaysShow: true },
    ];
    if (result.annualFees > 0) {
      slices.push({ label: 'Annual Fees', value: safe(result.totalFees), color: '#8b5cf6' });
    }
    return slices;
  }, [result]);

  async function handleDownloadPDF() {
    if (!result || result.status !== 'ok' || pdfLoading) return;
    setPdfLoading(true);
    try {
      await buildDebtRepaymentPDF({
        balance:               parseFloat(form.balance)        || 0,
        annualRate:            parseFloat(form.annualRate)     || 0,
        annualFees:            parseFloat(form.annualFees)     || 0,
        monthlyPayment:        parseFloat(form.monthlyPayment) || 0,
        extraPayment:          parseFloat(form.extraPayment)   || 0,
        months:                result.months,
        debtFreeStr:           result.debtFreeStr,
        totalInterest:         result.totalInterest,
        totalPaid:             result.totalPaid,
        monthlyInterestCharge: result.monthlyInterestCharge,
        principalPerPayment:   result.principalPerPayment,
        accel100InterestSaved: result.accel100InterestSaved,
        accel100MonthsSaved:   result.accel100MonthsSaved,
        accel100DebtFreeStr:   result.accel100DebtFreeStr,
        extraMonths:           result.accelMonths ?? null,
        extraDebtFreeStr:      result.accelDebtFreeStr ?? null,
        extraInterestSaved:    result.accelInterestSaved ?? null,
        region,
      });
    } catch (e) {
      console.error('PDF generation failed', e);
    } finally {
      setPdfLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-y-7 md:gap-y-8 min-w-0">

      {/* ══ Block A: Input Card (7) + Results Card (5) ══════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">

        {/* ── Input Card — col-span-7 ──────────────────────────────────────── */}
        <div className="lg:col-span-7 lg:self-start" style={cardStyle}>
          <div className="p-5 md:p-6">

            {/* Card header */}
            <div className="flex items-center gap-3 mb-4 md:mb-5">
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: 'linear-gradient(135deg,#1DB584 0%,#17a070 100%)',
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(29,181,132,0.30)',
              }}>
                <CreditCard size={15} color="white" strokeWidth={2.2} aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                  Debt Repayment
                </p>
                <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>Loan Details</p>
              </div>
            </div>

            {/* 2-column field grid */}
            <div className="grid grid-cols-2 gap-x-2 md:gap-x-5">

              {/* Left column */}
              <div className="space-y-3 min-w-0">

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle} htmlFor="dr-balance">
                    Current Balance <Tooltip text={TOOLTIPS.balance} />
                  </label>
                  <NumericInput
                    value={form.balance}
                    onChange={(v) => set('balance', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                  />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle} htmlFor="dr-rate">
                    Annual Interest Rate <Tooltip text={TOOLTIPS.annualRate} />
                  </label>
                  <NumericInput
                    value={form.annualRate}
                    onChange={(v) => set('annualRate', v)}
                    suffix="%"
                    inputClassName={inputClsCompact}
                  />
                  {(() => {
                    const raw = parseFloat(form.annualRate);
                    return !isNaN(raw) && (raw < 0 || raw > 99.9) ? (
                      <p className="mt-0.5 text-[10px]" style={{ color: '#f59e0b' }}>
                        Rate must be 0–99.9%. Using {Math.max(0, Math.min(99.9, raw))}%.
                      </p>
                    ) : null;
                  })()}
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle} htmlFor="dr-fees">
                    Annual Fees <Tooltip text={TOOLTIPS.annualFees} />
                  </label>
                  <NumericInput
                    value={form.annualFees}
                    onChange={(v) => set('annualFees', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                  />
                  <p className="mt-0.5 text-[10px]" style={{ color: '#9BA8B5' }}>
                    Optional — e.g. credit card annual fee
                  </p>
                </div>

              </div>{/* end left column */}

              {/* Right column */}
              <div className="border-l pl-2 md:pl-5 space-y-3 min-w-0" style={{ borderColor: 'rgba(15,41,66,0.08)' }}>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle} htmlFor="dr-payment">
                    Minimum Monthly Payment <Tooltip text={TOOLTIPS.monthlyPayment} />
                  </label>
                  <NumericInput
                    value={form.monthlyPayment}
                    onChange={(v) => set('monthlyPayment', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                  />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle} htmlFor="dr-extra">
                    Extra Monthly Payment <Tooltip text={TOOLTIPS.extraPayment} />
                  </label>
                  <NumericInput
                    value={form.extraPayment}
                    onChange={(v) => set('extraPayment', v)}
                    prefix={currencyPrefix}
                    inputClassName={inputClsCompact}
                  />
                  <p className="mt-0.5 text-[10px]" style={{ color: '#9BA8B5' }}>
                    Optional — see the impact below
                  </p>
                </div>

              </div>{/* end right column */}

            </div>{/* end 2-col grid */}

          </div>
        </div>{/* end Input Card */}

        {/* Mobile-only CTA — scroll to results */}
        <div className="lg:hidden">
          <MobileCalcCTA />
        </div>

        {/* ── Dark Navy Results Card — col-span-5 ──────────────────────────── */}
        <div id="calc-results" className="lg:col-span-5" style={{ scrollMarginTop: '80px' }}>
          <div
            className="flex flex-col h-full p-5 md:p-6 rounded-[20px]"
            style={{
              background: 'linear-gradient(150deg, #0D2137 0%, #0A1628 55%, #0D1B2A 100%)',
              border: '1px solid rgba(29,181,132,0.22)',
              minHeight: 340,
              boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(29,181,132,0.08)',
            }}
          >
            {/* ── Empty state ── */}
            {result.status === 'empty' && (
              <div className="flex flex-1 items-center justify-center py-12">
                <p style={{
                  color: 'rgba(255,255,255,0.25)',
                  fontSize: '14px',
                  textAlign: 'center',
                  lineHeight: 1.7,
                }}>
                  Enter your balance and monthly payment<br />to see your payoff timeline.
                </p>
              </div>
            )}

            {/* ── Payment-too-low error state ── */}
            {result.status === 'payment-too-low' && (
              <div className="flex flex-col flex-1 gap-4">

                {/* Named error badge */}
                <div
                  className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
                  style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.28)' }}
                >
                  <AlertTriangle size={18} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 1 }} aria-hidden />
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#F59E0B' }}>
                      Payment Too Low to Reduce Balance
                    </p>
                  </div>
                </div>

                {/* Explanation */}
                <div className="space-y-3 px-1">
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    Your monthly payment of{' '}
                    <span className="font-semibold text-white">
                      {fmtx(safe(parseFloat(form.monthlyPayment) || 0))}
                    </span>{' '}
                    doesn&apos;t cover the monthly interest charge of{' '}
                    <span className="font-semibold" style={{ color: '#F59E0B' }}>
                      {fmtx(safe(result.monthlyInterest))}
                    </span>.
                    The balance will grow each month, not shrink.
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    To make progress on this debt, increase your monthly payment to at least{' '}
                    <span className="font-bold text-white">
                      {fmtx(safe(result.minViablePayment))}
                    </span>.
                  </p>
                </div>

                {/* Stat row */}
                <div
                  className="mt-2 rounded-xl p-4 space-y-2.5"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Monthly interest charge
                    </span>
                    <span className="text-[13px] font-semibold" style={{ color: '#F59E0B' }}>
                      {fmtx(safe(result.monthlyInterest))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Minimum viable payment
                    </span>
                    <span className="text-[13px] font-bold text-white">
                      {fmtx(safe(result.minViablePayment))}
                    </span>
                  </div>
                </div>

              </div>
            )}

            {/* ── Ok state — full results ── */}
            {result.status === 'ok' && (
              <div className="flex flex-col flex-1 gap-4">

                {/* Primary result: debt-free date */}
                <div
                  className="rounded-xl p-5"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
                >
                  <p style={{
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em',
                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)',
                  }}>
                    Debt-Free Date
                  </p>
                  <p style={{ color: '#1DB584', fontSize: '38px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, marginTop: 8 }}>
                    {result.debtFreeStr || '—'}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: 6, fontWeight: 500 }}>
                    {result.months} months to payoff
                  </p>
                </div>

                {/* Monthly payment breakdown */}
                <div className="space-y-0 px-1 divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-slate-300">Monthly Payment</span>
                    <span className="text-[13px] font-semibold text-white">{fmtx(safe(result.payment))}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#F59E0B' }} />
                      <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Goes to interest</span>
                    </div>
                    <span className="text-[13px] font-semibold" style={{ color: '#F59E0B' }}>
                      {fmtx(safe(result.monthlyInterestCharge))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#1DB584' }} />
                      <span className="text-[13px]" style={{ color: '#CBD5E1' }}>Reduces balance</span>
                    </div>
                    <span className="text-[13px] font-semibold" style={{ color: '#1DB584' }}>
                      {fmtx(safe(result.principalPerPayment))}
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)' }} />

                {/* Totals */}
                <div className="px-1 divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px]" style={{ color: '#F59E0B' }}>Total Interest Paid</span>
                    <span className="text-[13px] font-semibold" style={{ color: '#F59E0B' }}>{fmt(safe(result.totalInterest))}</span>
                  </div>
                  {result.annualFees > 0 && (
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[13px]" style={{ color: '#a78bfa' }}>Annual Fees (total)</span>
                      <span className="text-[13px] font-semibold" style={{ color: '#a78bfa' }}>{fmt(safe(result.totalFees))}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] text-slate-300 font-medium">Total Cost</span>
                    <span className="text-[13px] font-bold text-white">
                      {fmt(safe(result.totalPaid + result.totalFees))}
                    </span>
                  </div>
                </div>

                {/* CTA — scroll to AI Analysis */}
                <style>{`
                  @keyframes teal-glow-debt {
                    0%, 100% { box-shadow: 0 0 0 1px rgba(29,181,132,0.3), 0 0 14px rgba(29,181,132,0.12); }
                    50%       { box-shadow: 0 0 0 1px rgba(29,181,132,0.6), 0 0 26px rgba(29,181,132,0.28); }
                  }
                  .btn-ai-cta-debt {
                    animation: teal-glow-debt 2.8s ease-in-out infinite;
                    transition: transform 180ms ease, box-shadow 180ms ease;
                  }
                  .btn-ai-cta-debt:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 0 0 1px rgba(29,181,132,0.75), 0 0 32px rgba(29,181,132,0.38) !important;
                    animation: none;
                  }
                `}</style>
                <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.52)', marginBottom: 8, fontStyle: 'italic' }}>
                    See how extra payments could shorten your payoff.
                  </p>
                  <button
                    className="btn-ai-cta-debt w-full font-bold overflow-hidden"
                    onClick={() => {
                      const el = document.getElementById('ai-analysis');
                      if (!el) return;
                      const navH = (document.querySelector('header') as HTMLElement | null)?.getBoundingClientRect().height ?? 64;
                      window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - navH - 16), behavior: 'smooth' });
                    }}
                    onMouseEnter={() => setAiCtaHovered(true)}
                    onMouseLeave={() => setAiCtaHovered(false)}
                    style={{
                      position: 'relative',
                      background: '#060F1A',
                      color: '#ffffff',
                      borderRadius: 8,
                      height: 40,
                      fontSize: '13px',
                      border: '1px solid rgba(29,181,132,0.3)',
                    }}
                  >
                    <span style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      whiteSpace: 'nowrap',
                      opacity: aiCtaHovered ? 0 : 1,
                      transition: 'opacity 200ms ease',
                      pointerEvents: 'none',
                    }}>
                      {(() => {
                        const activeInterestSaved = result.extraPayment > 0 && result.accelInterestSaved !== null ? result.accelInterestSaved : result.accel100InterestSaved;
                        const activeMonthsSaved = result.extraPayment > 0 && result.accelMonthsSaved !== null ? result.accelMonthsSaved : result.accel100MonthsSaved;
                        if (activeInterestSaved > 0) return <>See How to Save {fmt(safe(activeInterestSaved))} ↓</>;
                        if (activeMonthsSaved > 0) return <>See How to Pay Off {activeMonthsSaved} {activeMonthsSaved === 1 ? 'Month' : 'Months'} Sooner ↓</>;
                        return <>Unlock AI Debt Analysis ↓</>;
                      })()}
                    </span>
                    <span style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      whiteSpace: 'nowrap',
                      opacity: aiCtaHovered ? 1 : 0,
                      transition: 'opacity 200ms ease',
                      pointerEvents: 'none',
                    }}>
                      Unlock AI Debt Analysis ↓
                    </span>
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>{/* end Results Card */}

      </div>{/* end Block A */}

      {/* ══ Block C: Debt Breakdown + Payoff Timeline ══════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">

        {/* ── Left: Debt Breakdown donut ──────────────────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">

            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Cost breakdown
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Debt Breakdown</h3>
            </div>

            {/* Empty / PTL placeholder */}
            {result.status !== 'ok' && (
              <div
                className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{
                  background: result.status === 'payment-too-low' ? 'rgba(245,158,11,0.05)' : 'rgba(15,41,66,0.03)',
                  border: result.status === 'payment-too-low' ? '1px dashed rgba(245,158,11,0.25)' : '1px dashed rgba(15,41,66,0.10)',
                }}
              >
                <p className="text-sm text-center" style={{ color: result.status === 'payment-too-low' ? 'rgba(245,158,11,0.8)' : 'rgba(13,27,42,0.3)' }}>
                  {result.status === 'payment-too-low'
                    ? 'Increase your payment to see a breakdown.'
                    : 'Enter loan details to see the breakdown.'}
                </p>
              </div>
            )}

            {/* Ok: donut (left) + legend (right) — matches CA Mortgage breakdown layout */}
            {result.status === 'ok' && donutSlices && (() => {
              const totalCost = safe(result.totalPaid) + safe(result.totalFees);
              const rows = [
                { label: 'Principal Balance', value: result.balance, color: '#1DB584' },
                { label: 'Estimated Interest', value: result.totalInterest, color: '#F59E0B' },
                ...(result.annualFees > 0
                  ? [{ label: 'Annual Fees', value: result.totalFees, color: '#8b5cf6' }]
                  : []),
              ];
              return (
                <div className="flex flex-col md:flex-row items-center gap-4 flex-1">
                  <div className="shrink-0">
                    <DonutChart
                      slices={donutSlices}
                      className="w-52 h-52"
                      centerValue={fmt(totalCost)}
                      centerLabel="total cost"
                    />
                  </div>
                  <div className="w-full md:flex-1 divide-y" style={{ borderColor: 'rgba(15,41,66,0.07)' }}>
                    {rows.map(({ label, value, color }) => {
                      const pct = totalCost > 0 ? Math.round((safe(value) / totalCost) * 100) : 0;
                      return (
                        <div key={label} className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                            <span style={{ color: '#4B5563', fontSize: '12.5px' }}>{label}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-slate-400">{pct}%</span>
                            <span className="font-semibold" style={{ color: '#0D1B2A', fontSize: '12.5px' }}>{fmt(safe(value))}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between py-2">
                      <span className="font-semibold text-slate-700" style={{ fontSize: '12.5px' }}>Total Cost</span>
                      <span className="font-bold" style={{ color: '#0D1B2A', fontSize: '12.5px' }}>{fmt(totalCost)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>

        {/* ── Right: Payoff Timeline ──────────────────────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">

            <div className="mb-4 md:mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Balance over time
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Payoff Timeline</h3>
            </div>

            {/* Empty placeholder */}
            {result.status === 'empty' && (
              <div
                className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}
              >
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter loan details to see the payoff chart.
                </p>
              </div>
            )}

            {/* PTL placeholder */}
            {result.status === 'payment-too-low' && (
              <div
                className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(245,158,11,0.05)', border: '1px dashed rgba(245,158,11,0.25)' }}
              >
                <p className="text-sm" style={{ color: 'rgba(245,158,11,0.8)' }}>
                  Increase your payment to see the payoff timeline.
                </p>
              </div>
            )}

            {/* Chart — ok state */}
            {result.status === 'ok' && chartData && (
              <div className="flex flex-col flex-1">

                {/* SVG chart */}
                <div className="overflow-x-auto -mx-1">
                  <svg
                    viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                    style={{ width: '100%', maxWidth: SVG_W, display: 'block', margin: '0 auto' }}
                    aria-hidden
                  >
                    {/* Y-axis balance labels at 100 / 50 / 0 % */}
                    {([1.0, 0.5, 0.0] as const).map((frac) => {
                      const yy = frac === 1.0 ? PAD_T : frac === 0.0 ? Y_FLOOR : PAD_T + CH / 2;
                      const balVal = frac * result.balance;
                      const lbl = balVal === 0
                        ? '$0'
                        : balVal >= 1000000
                        ? `$${parseFloat((balVal / 1000000).toFixed(2))}M`
                        : balVal >= 1000
                        ? `$${parseFloat((balVal / 1000).toFixed(1))}K`
                        : `$${balVal.toFixed(0)}`;
                      return (
                        <text key={frac} x={PAD_L - 6} y={yy + 4} textAnchor="end"
                          fontSize={9} fill="rgba(15,41,66,0.38)"
                          style={{ fontFamily: 'system-ui,sans-serif' }}>
                          {lbl}
                        </text>
                      );
                    })}

                    {/* Horizontal grid lines at 25 / 50 / 75 % of opening balance */}
                    {([0.25, 0.5, 0.75] as const).map((frac) => {
                      const gy = (PAD_T + CH * (1 - frac)).toFixed(1);
                      return (
                        <line
                          key={frac}
                          x1={PAD_L} y1={gy}
                          x2={PAD_L + CW} y2={gy}
                          stroke="rgba(15,41,66,0.06)" strokeWidth={1}
                          strokeDasharray="4 4"
                        />
                      );
                    })}

                    {/* Year markers — vertical dashed guides + Yr N labels */}
                    {chartData.yearMarkers.map(({ yr, x }) => (
                      <g key={yr}>
                        <line
                          x1={x.toFixed(1)} y1={PAD_T}
                          x2={x.toFixed(1)} y2={Y_FLOOR}
                          stroke="rgba(15,41,66,0.07)" strokeWidth={1} strokeDasharray="3 3"
                        />
                        <text
                          x={x.toFixed(1)} y={Y_FLOOR + 16}
                          textAnchor="middle" fontSize={9}
                          fill="rgba(15,41,66,0.38)"
                          style={{ fontFamily: 'system-ui,sans-serif' }}
                        >
                          Yr {yr}
                        </text>
                      </g>
                    ))}

                    {/* Floor line */}
                    <line
                      x1={PAD_L} y1={Y_FLOOR}
                      x2={PAD_L + CW} y2={Y_FLOOR}
                      stroke="rgba(15,41,66,0.15)" strokeWidth={1}
                    />

                    {/* Base area fill */}
                    <path d={chartData.basePaths.areaPath} fill="rgba(203,213,225,0.20)" />

                    {/* Accel area fill */}
                    {chartData.accelPaths && (
                      <path d={chartData.accelPaths.areaPath} fill="rgba(29,181,132,0.13)" />
                    )}

                    {/* Base polyline — slate, stronger */}
                    <polyline
                      points={chartData.basePaths.points}
                      fill="none"
                      stroke="rgba(100,116,139,0.80)"
                      strokeWidth={2.5}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />

                    {/* Accel polyline — teal, bold */}
                    {chartData.accelPaths && (
                      <polyline
                        points={chartData.accelPaths.points}
                        fill="none"
                        stroke="#1DB584"
                        strokeWidth={4}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Base end dot */}
                    <circle cx={PAD_L + CW} cy={Y_FLOOR} r={5}
                      fill="rgba(100,116,139,0.85)" stroke="white" strokeWidth={1.5} />

                    {/* Accel end dot */}
                    {chartData.accelPaths && (() => {
                      const ax = PAD_L + (chartData.accelEndMonth / chartData.baseEndMonth) * CW;
                      return (
                        <circle cx={ax.toFixed(1)} cy={Y_FLOOR} r={5.5}
                          fill="#1DB584" stroke="white" strokeWidth={1.5} />
                      );
                    })()}

                    {/* Callout box + dotted guide line above accel endpoint */}
                    {chartData.accelPaths && chartData.calloutMonthsSaved > 0 && (() => {
                      const ax = PAD_L + (chartData.accelEndMonth / chartData.baseEndMonth) * CW;
                      const BOX_W = 106;
                      const BOX_H = 60;
                      const BOX_TOP = 4;
                      const bxc = Math.min(
                        Math.max(ax, PAD_L + BOX_W / 2 + 4),
                        PAD_L + CW - BOX_W / 2 - 4,
                      );
                      const bxl = bxc - BOX_W / 2;
                      const monthsLabel = chartData.calloutMonthsSaved >= 24
                        ? `${(chartData.calloutMonthsSaved / 12).toFixed(1).replace('.0', '')} yrs`
                        : `${chartData.calloutMonthsSaved} mo`;
                      return (
                        <g>
                          {/* Dotted vertical guide line from box to endpoint */}
                          <line
                            x1={ax.toFixed(1)} y1={(BOX_TOP + BOX_H + 4).toFixed(1)}
                            x2={ax.toFixed(1)} y2={(Y_FLOOR - 7).toFixed(1)}
                            stroke="#1DB584" strokeWidth={1.2}
                            strokeDasharray="3.5 2.5" strokeOpacity={0.50}
                          />
                          {/* Box */}
                          <rect
                            x={bxl.toFixed(1)} y={BOX_TOP}
                            width={BOX_W} height={BOX_H}
                            rx={7} fill="white" stroke="#D5DDE5" strokeWidth={1.5}
                          />
                          {/* "Paid off" */}
                          <text x={bxc.toFixed(1)} y={BOX_TOP + 18} textAnchor="middle"
                            fontSize={9.5} fill="#9BA8B5"
                            style={{ fontFamily: 'system-ui,sans-serif' }}>
                            Paid off
                          </text>
                          {/* "X months / X yrs" */}
                          <text x={bxc.toFixed(1)} y={BOX_TOP + 41} textAnchor="middle"
                            fontSize={17} fontWeight="800" fill="#0D1B2A"
                            style={{ fontFamily: 'system-ui,sans-serif', letterSpacing: '-0.5px' }}>
                            {monthsLabel}
                          </text>
                          {/* "earlier" */}
                          <text x={bxc.toFixed(1)} y={BOX_TOP + 57} textAnchor="middle"
                            fontSize={9.5} fill="#9BA8B5"
                            style={{ fontFamily: 'system-ui,sans-serif' }}>
                            earlier
                          </text>
                        </g>
                      );
                    })()}
                  </svg>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3">
                  <div className="flex items-center gap-2">
                    <svg width="22" height="8" aria-hidden>
                      <line x1="0" y1="4" x2="15" y2="4" stroke="rgba(100,116,139,0.80)" strokeWidth="2.5" />
                      <circle cx="19" cy="4" r="3.5" fill="rgba(100,116,139,0.80)" />
                    </svg>
                    <span className="text-[11px]" style={{ color: '#64748B' }}>Current pace</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="22" height="8" aria-hidden>
                      <line x1="0" y1="4" x2="15" y2="4" stroke="#1DB584" strokeWidth="4" />
                      <circle cx="19" cy="4" r="3.5" fill="#1DB584" />
                    </svg>
                    <span className="text-[11px]" style={{ color: '#64748B' }}>
                      {chartData.hasUserExtra
                        ? `With extra ${fmt(safe(result.extraPayment))}/mo`
                        : `With extra ${fmt(100)}/mo`}
                    </span>
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>

      </div>

      {/* ══ Block D: AI Analysis — always visible ═══════════════════════════ */}
      <div
        id="ai-analysis"
        className="overflow-hidden"
        style={{ ...cardStyle, padding: 0, scrollMarginTop: '80px' }}
      >

        {/* ── Dark navy header — matches locked V2 template exactly ── */}
        <div
          className="px-4 md:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #0f2744 100%)' }}
        >
          <div className="flex items-center gap-3">
            <span
              className="flex items-center justify-center shrink-0"
              style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(29,181,132,0.18)' }}
            >
              <Sparkles className="w-4 h-4" style={{ color: '#1DB584' }} aria-hidden />
            </span>
            <p className="text-white text-lg md:text-xl font-bold tracking-tight">
              FinCalc <span style={{ color: '#1DB584' }}>Smart</span> AI Debt Analysis
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={!result || result.status !== 'ok' || pdfLoading}
              aria-disabled={!result || result.status !== 'ok' || pdfLoading}
              title={!result || result.status !== 'ok' ? 'Calculate first to generate a report' : 'Download PDF report'}
              className="inline-flex items-center gap-1.5"
              style={{
                background: '#1DB584', color: '#ffffff', borderRadius: 9999,
                padding: '7px 16px', fontSize: '13px', fontWeight: 700,
                opacity: (!result || result.status !== 'ok' || pdfLoading) ? 0.65 : 1,
                cursor: (!result || result.status !== 'ok' || pdfLoading) ? 'not-allowed' : 'pointer',
              }}
            >
              <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {pdfLoading ? 'Generating…' : 'Download PDF'}
            </button>
            <button
              disabled aria-disabled="true" title="Coming soon"
              className="inline-flex items-center gap-1.5 cursor-not-allowed select-none"
              style={{ border: '1.5px solid rgba(255,255,255,0.30)', color: 'rgba(255,255,255,0.78)', background: 'rgba(255,255,255,0.06)', borderRadius: 9999, padding: '7px 16px', fontSize: '13px', fontWeight: 700 }}
            >
              <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden />
              Email Results
            </button>
          </div>
        </div>

        {/* ── Dashboard body ── */}
        <div className="p-4 md:p-5" style={{ background: '#f4f6f9' }}>

          {/* Empty state */}
          {!aiData && (
            <div
              className="flex flex-col items-center justify-center py-10 rounded-2xl gap-3"
              style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.08)' }}
            >
              <Sparkles className="w-5 h-5" style={{ color: '#1DB584' }} aria-hidden />
              <p className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>
                Enter your loan details above to get AI debt insights.
              </p>
              <p className="text-xs text-center px-4" style={{ color: '#94a3b8', maxWidth: 340 }}>
                The analysis will show your repayment status, total cost breakdown, and your fastest path to becoming debt-free.
              </p>
            </div>
          )}

          {/* Active state */}
          {aiData && (
            <>

              {/* ── PTL: Full-width Debt Payoff Status ── */}
              {aiData.isPTL && (
                <div
                  className="rounded-2xl p-4 md:p-5 mb-4 flex flex-col gap-3"
                  style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.09)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                    <span className="text-sm font-bold text-slate-800">Debt Payoff Status</span>
                    <span className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0"
                      style={{ background: aiData.statusBg, color: aiData.statusColor }}>
                      {aiData.statusLabel}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-800">
                      Your payment doesn&apos;t reduce the balance.
                    </p>
                    <p className="text-xs leading-relaxed text-slate-500">
                      Monthly interest charges of{' '}
                      <span className="font-semibold text-slate-700">{fmtx(safe(aiData.monthlyInterest))}</span>{' '}
                      exceed your payment. The minimum to start making progress is{' '}
                      <span className="font-semibold text-slate-700">{fmtx(safe(aiData.minViablePayment))}</span>.
                    </p>
                    <div
                      className="rounded-xl p-3 grid grid-cols-2 gap-3"
                      style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
                    >
                      <div className="text-center">
                        <p className="text-base font-extrabold" style={{ color: '#ef4444' }}>
                          {fmtx(safe(aiData.monthlyInterest))}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">monthly interest</p>
                      </div>
                      <div className="text-center">
                        <p className="text-base font-extrabold text-slate-800">
                          {fmtx(safe(aiData.minViablePayment))}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">min viable payment</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── OK: Row 1 — Debt Payoff Status + Smart Opportunity (side by side on desktop) ── */}
              {!aiData.isPTL && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                  {/* Debt Payoff Status — Mortgage Health Score style */}
                  <style>{`
                    .dps-gauge { position: relative; flex-shrink: 0; width: 160px; height: 160px; }
                    .dps-gauge svg { display: block; width: 160px; height: 160px; }
                    .dps-gauge-label { padding-bottom: 14px; }
                    @media (min-width: 768px) {
                      .dps-gauge { width: 220px; height: 220px; }
                      .dps-gauge svg { width: 220px; height: 220px; }
                      .dps-gauge-label { padding-bottom: 22px; }
                    }
                  `}</style>
                  <div
                    className="rounded-2xl p-3 flex flex-col"
                    style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.09)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                      <span className="text-sm font-bold text-slate-800">Debt Payoff Status</span>
                    </div>
                    <div className="flex-1 flex items-center gap-4">
                      {/* SVG gauge — 160px mobile / 220px desktop, matches Mortgage Health Score */}
                      {(() => {
                        const GR   = 52;
                        const GC   = 2 * Math.PI * GR;
                        const GARC = (240 / 360) * GC;
                        const GFIL = GARC * Math.min(safe(aiData.interestRatio), 1);
                        return (
                          <div className="dps-gauge">
                            <svg viewBox="0 0 140 140" aria-hidden>
                              <circle cx="70" cy="70" r={GR} fill="none"
                                stroke="rgba(15,41,66,0.09)" strokeWidth="11" strokeLinecap="round"
                                strokeDasharray={`${GARC.toFixed(1)} ${(GC - GARC).toFixed(1)}`}
                                transform="rotate(150, 70, 70)"
                              />
                              <circle cx="70" cy="70" r={GR} fill="none"
                                stroke={aiData.statusColor} strokeWidth="11" strokeLinecap="round"
                                strokeDasharray={`${GFIL.toFixed(1)} ${(GC - GFIL).toFixed(1)}`}
                                transform="rotate(150, 70, 70)"
                                style={{ transition: 'stroke-dasharray 0.9s ease' }}
                              />
                            </svg>
                            {/* Score centered in arc */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: 16 }}>
                              <span style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 800, color: '#0D1B2A', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                                {Math.round(safe(aiData.interestRatio) * 100)}
                              </span>
                              <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500, lineHeight: 1.6 }}>% interest</span>
                            </div>
                            {/* Status label at bottom of arc gap */}
                            <div className="dps-gauge-label absolute bottom-0 left-0 right-0 flex justify-center">
                              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: aiData.statusColor, letterSpacing: '0.02em' }}>
                                {aiData.statusLabel}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                      {/* Description — RIGHT */}
                      <div className="min-w-0">
                        <p className="text-slate-800 font-bold text-sm leading-snug mb-2">
                          <span style={{ fontSize: 'clamp(1.5rem, 4vw, 1.9rem)', fontWeight: 800, color: '#0D1B2A', letterSpacing: '-0.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                            {aiData.months}
                          </span>
                          {' '}<span className="text-sm font-semibold text-slate-400">mo to payoff</span>
                        </p>
                        <p className="text-slate-500 text-xs leading-relaxed">
                          {aiData.statusLabel === 'Healthy'
                            ? `At ${aiData.months} ${aiData.months === 1 ? 'month' : 'months'}, your repayment timeline is well-managed. Maintain your payment to stay on track.`
                            : aiData.statusLabel === 'Watch'
                              ? `Your ${aiData.months}-month payoff is manageable. A modest increase in monthly payment can noticeably reduce your total interest cost.`
                              : `A ${aiData.months}-month payoff carries a significant interest burden. Increasing your monthly payment is the most effective lever available.`
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Smart Opportunity Found — dark navy */}
                  {(() => {
                    const interestSaved = safe(aiData.hasUserExtra ? (aiData.accelInterestSaved ?? 0) : aiData.accel100InterestSaved);
                    const monthsSaved = aiData.hasUserExtra ? (aiData.accelMonthsSaved ?? 0) : aiData.accel100MonthsSaved;
                    // At a 0% rate (or other edge cases) interest saved can be $0 even though the
                    // payoff still finishes sooner — lead with the months-saved figure instead of
                    // a self-contradictory "$0 saved" headline.
                    const leadWithMonths = interestSaved <= 0 && monthsSaved > 0;
                    const extraLabel = aiData.hasUserExtra
                      ? `with your extra ${fmtx(safe(aiData.extraPayment))}/month`
                      : `by adding ${fmt(100)}/month to your payment`;
                    return (
                    <div
                      className="rounded-2xl p-3 flex flex-col"
                      style={{ background: 'linear-gradient(145deg, #0D1B2A 0%, #0c1e3a 100%)', border: '1px solid rgba(29,181,132,0.14)', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                        <span className="text-sm font-bold" style={{ color: '#1DB584' }}>
                          {interestSaved > 0 || monthsSaved > 0 ? 'Smart Opportunity Found' : 'No Additional Savings'}
                        </span>
                      </div>

                      {/* Mobile layout */}
                      <div className="flex flex-col gap-3 mt-1 lg:hidden">
                        <div className="rounded-xl flex items-center justify-center px-4 py-4"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                          <span className="font-extrabold tabular-nums"
                            style={{ fontSize: 'clamp(1.9rem, 9vw, 2.4rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                            {leadWithMonths ? `${monthsSaved} mo` : fmt(interestSaved)}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">{leadWithMonths ? 'earlier payoff' : 'estimated interest saved'}</p>
                          <p className="text-slate-400 text-xs mt-0.5">{extraLabel}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                              {fmtx(safe(aiData.hasUserExtra ? aiData.extraPayment : 100))}
                              <span className="text-slate-400 font-normal text-xs">/mo</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <DollarSign className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Extra payment</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-3 py-3"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                              {monthsSaved}
                              <span className="text-slate-400 font-normal text-xs"> mo</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Earlier payoff</span>
                            </div>
                          </div>
                        </div>
                        {!aiData.hasUserExtra && (
                          <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                            Enter a custom amount in the Extra Payment field above ↑
                          </p>
                        )}
                      </div>

                      {/* Desktop layout */}
                      <div className="hidden lg:flex flex-col gap-3 mt-1 flex-1 justify-center">
                        <div className="flex items-stretch gap-3">
                          <div className="flex-1 min-w-0 rounded-xl flex items-center justify-center px-4 py-7"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            <span className="font-extrabold tabular-nums"
                              style={{ fontSize: 'clamp(2.0rem, 4vw, 2.7rem)', color: '#1DB584', letterSpacing: '-2px', lineHeight: 1 }}>
                              {leadWithMonths ? `${monthsSaved} mo` : fmt(interestSaved)}
                            </span>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
                              {fmtx(safe(aiData.hasUserExtra ? aiData.extraPayment : 100))}
                              <span className="text-slate-400 font-normal" style={{ fontSize: '0.8rem' }}>/mo</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <DollarSign className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Extra payment</span>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center rounded-xl px-4 py-7 shrink-0"
                            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', minWidth: 100 }}>
                            <div className="text-white font-bold tabular-nums mb-1.5" style={{ fontSize: '1.1rem', lineHeight: 1.2 }}>
                              {monthsSaved}
                              <span className="text-slate-400 font-normal text-sm"> mo</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                              <span className="text-slate-400 text-xs">Earlier payoff</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">{leadWithMonths ? 'earlier payoff' : 'estimated interest saved'}</p>
                          <p className="text-slate-400 text-xs mt-0.5">
                            {aiData.hasUserExtra
                              ? <>with your extra <span className="text-slate-300 font-semibold">{fmtx(safe(aiData.extraPayment))}/month</span></>
                              : <>by adding <span className="text-slate-300 font-semibold">{fmt(100)}/month</span> to your payment</>}
                          </p>
                        </div>
                        {!aiData.hasUserExtra && (
                          <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.28)' }}>
                            Enter a custom amount in the Extra Payment field above ↑
                          </p>
                        )}
                      </div>

                    </div>
                    );
                  })()}
                </div>
              )}

              {/* ── OK: Row 2 — 3 insight cards in a single row on desktop ── */}
              {!aiData.isPTL && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  {/* Interest Pressure */}
                  <div className="rounded-2xl p-4" style={{ background: '#fff5f5', border: '1px solid #fecaca' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="flex items-center justify-center shrink-0"
                        style={{ width: 28, height: 28, borderRadius: 8, background: '#fee2e2' }}>
                        <Zap className="w-3.5 h-3.5 text-red-500" aria-hidden />
                      </span>
                      <p className="text-xs font-bold uppercase tracking-widest text-red-500">Interest Pressure</p>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      In month one,{' '}
                      <strong className="text-red-600">{fmtx(safe(aiData.monthlyInterest))}</strong> of your{' '}
                      {fmtx(safe(aiData.payment))} payment goes to interest — only{' '}
                      <strong className="text-red-600">{fmtx(safe(aiData.principalPerPayment))}</strong> reduces your
                      balance. This front-loading is why early repayment feels slow.
                    </p>
                  </div>

                  {/* Payment Efficiency */}
                  <div className="rounded-2xl p-4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="flex items-center justify-center shrink-0"
                        style={{ width: 28, height: 28, borderRadius: 8, background: '#e0f2fe' }}>
                        <BarChart2 className="w-3.5 h-3.5 text-sky-600" aria-hidden />
                      </span>
                      <p className="text-xs font-bold uppercase tracking-widest text-sky-600">Payment Efficiency</p>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      Only{' '}
                      <strong className="text-sky-600">{aiData.principalPct}%</strong>{' '}
                      of each payment currently reduces your balance.{' '}
                      {aiData.principalPct < 50
                        ? 'More than half of every dollar is lost to interest. Extra payments flip this ratio faster than any other action.'
                        : 'A solid efficiency ratio — sustaining your payment keeps the momentum going.'}
                    </p>
                  </div>

                  {/* Next Best Step */}
                  <div className="rounded-2xl p-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="flex items-center justify-center shrink-0"
                        style={{ width: 28, height: 28, borderRadius: 8, background: '#dcfce7' }}>
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
                      </span>
                      <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Next Best Step</p>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {aiData.hasUserExtra
                        ? `Adding ${fmt(safe(aiData.extraPayment))}/month saves ${fmt(safe(aiData.accelInterestSaved ?? 0))} in interest and delivers you debt-free ${aiData.accelMonthsSaved ?? 0} ${(aiData.accelMonthsSaved ?? 0) === 1 ? 'month' : 'months'} sooner. Stay consistent to reach your target date.`
                        : aiData.statusLabel === 'Healthy'
                          ? `Your plan is on track — ${aiData.months} ${aiData.months === 1 ? 'month' : 'months'} to debt-free. Once clear, redirecting ${fmtx(safe(aiData.payment))}/month toward savings will build the next stage of financial momentum.`
                          : `Adding ${fmt(100)}/month saves ${fmt(safe(aiData.accel100InterestSaved))} and cuts ${aiData.accel100MonthsSaved} ${aiData.accel100MonthsSaved === 1 ? 'month' : 'months'} from your timeline. Use the Extra Payment field above to model your exact number.`
                      }
                    </p>
                  </div>

                </div>
              )}

              {/* ── PTL guidance cards ── */}
              {aiData.isPTL && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl p-4" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="flex items-center justify-center shrink-0"
                        style={{ width: 28, height: 28, borderRadius: 8, background: '#fef3c7' }}>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" aria-hidden />
                      </span>
                      <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Why the Balance Grows</p>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      Interest accrues on your full balance every month. When your payment is below the monthly interest charge, the shortfall is added back to your balance — making it larger, not smaller.
                    </p>
                  </div>
                  <div className="rounded-2xl p-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="flex items-center justify-center shrink-0"
                        style={{ width: 28, height: 28, borderRadius: 8, background: '#dcfce7' }}>
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
                      </span>
                      <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">The Fix</p>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      Raise your payment to at least{' '}
                      {fmtx(safe(aiData.minViablePayment))} to start reducing your principal.
                      Every dollar above this floor clears debt — the more above it, the faster the balance falls.
                    </p>
                  </div>
                </div>
              )}

            </>
          )}

        </div>{/* end dashboard body */}

        {/* ── Inner disclaimer ── */}
        <div
          className="flex items-start gap-2.5 px-5 md:px-6 py-4"
          style={{ borderTop: '1px solid rgba(15,41,66,0.07)', background: '#f8fafb' }}
        >
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden />
          <p className="text-slate-400 text-xs leading-relaxed">
            <strong className="text-slate-500 font-semibold">Disclaimer:</strong>{' '}
            This analysis is for illustrative purposes only and does not constitute financial, tax, or investment advice.
            Results assume a fixed interest rate, no new charges to the balance, and consistent monthly payments.
            Individual outcomes will vary based on lender terms and personal circumstances.
            Consult a licensed financial advisor before making financial decisions.
          </p>
        </div>

      </div>

      {/* ══ Block F: How It Works ════════════════════════════════════════════ */}
      {formulaContent && (
        <div style={cardStyle} className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
            How It Works
          </h2>
          <div className="space-y-4 text-sm md:text-base text-slate-600 leading-relaxed">
            {formulaContent}
          </div>
        </div>
      )}

      {/* ══ Block G: FAQ ═════════════════════════════════════════════════════ */}
      {faqItems.length > 0 && (
        <div style={cardStyle} className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
            Frequently Asked Questions
          </h2>
          <CalculatorFaqAccordion faqs={faqItems} />
        </div>
      )}

      {/* ══ Disclaimer — unconditional, always last ══════════════════════════ */}
      <p className="text-xs text-slate-400 text-center mt-4 pb-12 px-4 leading-relaxed max-w-4xl mx-auto">
        This calculator is for illustrative and informational purposes only. Results are estimates and
        may not reflect actual credit card terms, loan agreements, fees, interest changes, minimum
        payment rules, or lender conditions. This does not constitute financial, tax, or legal advice.
        Consult a licensed financial advisor or qualified professional before making financial decisions.
      </p>

    </div>
  );
}
