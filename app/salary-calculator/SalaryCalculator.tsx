'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useRegion } from '@/lib/region/context';
import { NumericInput, Tooltip, DonutChart, type PieSlice } from '../_mortgage-shared/ui';
import { fmtCAD, fmtCADx, fmtUSD, fmtUSDx } from '../_mortgage-shared/math';
import MobileCalcCTA from '@/components/ui/MobileCalcCTA';
import CalculatorFaqAccordion from '@/components/layout/CalculatorFaqAccordion';
import {
  AlertTriangle, BookOpen, Briefcase, Clock,
  Download, HelpCircle, Mail, ShieldAlert, Sparkles, TrendingUp, Wallet,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type SalaryType = 'Annual' | 'Monthly' | 'Biweekly' | 'Weekly' | 'Hourly';
type PayFreq = 'Monthly' | 'Semi-monthly' | 'Biweekly' | 'Weekly';

interface FormState {
  salaryAmount: string;
  hoursPerWeek: string;
  weeksPerYear: string;
  deductionRate: string;
}

interface SalaryResults {
  annualGross: number;
  monthlyGross: number;
  semiMonthlyGross: number;
  biweeklyGross: number;
  weeklyGross: number;
  dailyGross: number;
  hourlyEquivalent: number;
  annualDeductions: number;
  annualTakeHome: number;
  takeHomePerPeriod: number;
  effectiveHourlyRate: number;
  takeHomePct: number;
  periodsPerYear: number;
  payFreqLabel: string;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: FormState = {
  salaryAmount: '75000',
  hoursPerWeek: '40',
  weeksPerYear: '52',
  deductionRate: '25',
};

const SALARY_TYPES: SalaryType[] = ['Annual', 'Monthly', 'Biweekly', 'Weekly', 'Hourly'];
const PAY_FREQS: PayFreq[] = ['Monthly', 'Semi-monthly', 'Biweekly', 'Weekly'];

const PERIODS_PER_YEAR: Record<Exclude<PayFreq, 'Weekly'>, number> = {
  'Monthly': 12,
  'Semi-monthly': 24,
  'Biweekly': 26,
};

// Weekly pay periods track the user-entered weeksPerYear (not a fixed 52) so they
// stay consistent with weeklyGross, which already divides by weeksPerYear.
function formatPeriods(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return String(Math.round(n * 100) / 100);
}

// ─── Math — do not modify ─────────────────────────────────────────────────────

function computeResults(
  form: FormState,
  salaryType: SalaryType,
  payFreq: PayFreq,
): SalaryResults | null {
  const salaryAmount = parseFloat(form.salaryAmount) || 0;
  const hoursPerWeek = parseFloat(form.hoursPerWeek) || 0;
  const weeksPerYear = parseFloat(form.weeksPerYear) || 0;
  const deductionRate = Math.min(99, Math.max(0, parseFloat(form.deductionRate) || 0));

  if (salaryAmount <= 0) return null;
  if (hoursPerWeek <= 0 || weeksPerYear <= 0) return null;

  const hoursPerYear = hoursPerWeek * weeksPerYear;

  let annualGross: number;
  switch (salaryType) {
    case 'Annual':    annualGross = salaryAmount; break;
    case 'Monthly':   annualGross = salaryAmount * 12; break;
    case 'Biweekly':  annualGross = salaryAmount * 26; break;
    case 'Weekly':    annualGross = salaryAmount * weeksPerYear; break;
    case 'Hourly':    annualGross = salaryAmount * hoursPerYear; break;
  }

  if (!Number.isFinite(annualGross) || annualGross <= 0) return null;

  const monthlyGross     = annualGross / 12;
  const semiMonthlyGross = annualGross / 24;
  const biweeklyGross    = annualGross / 26;
  const weeklyGross      = annualGross / weeksPerYear;
  const dailyGross       = annualGross / (weeksPerYear * 5);
  const hourlyEquivalent = annualGross / hoursPerYear;

  const annualDeductions    = annualGross * (deductionRate / 100);
  const annualTakeHome      = annualGross - annualDeductions;
  const periodsPerYear      = payFreq === 'Weekly' ? weeksPerYear : PERIODS_PER_YEAR[payFreq];
  const takeHomePerPeriod   = annualTakeHome / periodsPerYear;
  const effectiveHourlyRate = annualTakeHome / hoursPerYear;
  const takeHomePct         = 100 - deductionRate;

  return {
    annualGross, monthlyGross, semiMonthlyGross, biweeklyGross,
    weeklyGross, dailyGross, hourlyEquivalent,
    annualDeductions, annualTakeHome, takeHomePerPeriod,
    effectiveHourlyRate, takeHomePct, periodsPerYear,
    payFreqLabel: payFreq,
  };
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  border: '1px solid rgba(15,41,66,0.09)',
  borderRadius: '20px',
  background: '#ffffff',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 2px 10px rgba(0,0,0,0.03)',
};

const inputClsBase =
  'w-full rounded-brand-sm border-[1.5px] border-brand-gray-200 text-brand-navy bg-brand-gray-50 ' +
  'px-3 py-2.5 text-sm transition-colors duration-150 ' +
  'focus:outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/[0.15]';

const inputClsCompact = inputClsBase
  .replace('py-2.5', 'py-1.5 md:py-2')
  .replace('px-3', 'pr-2 md:pr-3 pl-3');

const navyLabelStyle: React.CSSProperties = {
  fontWeight: 700, color: '#0D1B2A',
  display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4,
};
const navyLabelCls = 'text-[10px] md:text-xs';

// ─── Props ────────────────────────────────────────────────────────────────────

interface SalaryCalculatorProps {
  formulaContent?: ReactNode;
  faqItems?: Array<{ question: string; answer: string }>;
}

// ─── Pill helper ──────────────────────────────────────────────────────────────

function pillStyle(active: boolean): React.CSSProperties {
  return active
    ? { background: '#1DB584', color: '#fff', border: '1.5px solid #1DB584' }
    : { background: 'rgba(15,41,66,0.04)', color: '#4B5563', border: '1.5px solid rgba(15,41,66,0.10)' };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SalaryCalculator({ formulaContent, faqItems = [] }: SalaryCalculatorProps) {
  const { region } = useRegion();
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [salaryType, setSalaryType] = useState<SalaryType>('Annual');
  const [payFreq, setPayFreq] = useState<PayFreq>('Monthly');
  const [aiCtaHovered, setAiCtaHovered] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const isCA = region === 'ca';
  const currencyPrefix = isCA ? 'CA$' : '$';
  const fmt  = isCA ? fmtCAD  : fmtUSD;
  const fmtx = isCA ? fmtCADx : fmtUSDx;

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const results = useMemo(
    () => computeResults(form, salaryType, payFreq),
    [form, salaryType, payFreq],
  );

  const donutSlices = useMemo((): PieSlice[] | null => {
    if (!results) return null;
    return [
      { label: 'Estimated Take-Home', value: results.annualTakeHome, color: '#1DB584', alwaysShow: true },
      { label: 'Estimated Deductions', value: results.annualDeductions, color: '#F59E0B', alwaysShow: true },
    ];
  }, [results]);

  function scrollToAI() {
    const el = document.getElementById('ai-analysis');
    if (!el) return;
    const navH = (document.querySelector('header') as HTMLElement | null)?.getBoundingClientRect().height ?? 64;
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - navH - 16), behavior: 'smooth' });
  }

  // Pay Clarity Score
  const payClarityScore = results
    ? results.takeHomePct >= 70 ? Math.round(70 + (results.takeHomePct - 70) * 1.0)
      : results.takeHomePct >= 60 ? Math.round(55 + (results.takeHomePct - 60) * 1.5)
      : results.takeHomePct >= 50 ? Math.round(40 + (results.takeHomePct - 50) * 1.5)
      : Math.round(Math.max(0, results.takeHomePct * 0.8))
    : 0;

  const clarityLabel =
    payClarityScore >= 70 ? 'Low Deduction Load'
    : payClarityScore >= 55 ? 'Moderate Deduction Load'
    : 'High Deduction Load';

  const clarityColor =
    payClarityScore >= 70 ? '#1DB584'
    : payClarityScore >= 55 ? '#F59E0B'
    : '#EF4444';

  const clarityBg =
    payClarityScore >= 70 ? 'rgba(29,181,132,0.10)'
    : payClarityScore >= 55 ? 'rgba(245,158,11,0.10)'
    : 'rgba(239,68,68,0.10)';

  async function handleDownloadPDF() {
    if (!results || pdfLoading) return;
    setPdfLoading(true);
    try {
      const { buildSalaryPDF } = await import('@/lib/pdf/adapters/taxIncomeAdapter');
      await buildSalaryPDF({
        salaryAmount:        parseFloat(form.salaryAmount) || 0,
        salaryType,
        payFreq,
        hoursPerWeek:        parseFloat(form.hoursPerWeek) || 0,
        weeksPerYear:        parseFloat(form.weeksPerYear) || 0,
        deductionRate:       Math.min(99, Math.max(0, parseFloat(form.deductionRate) || 0)),
        annualGross:         results.annualGross,
        monthlyGross:        results.monthlyGross,
        biweeklyGross:       results.biweeklyGross,
        weeklyGross:         results.weeklyGross,
        dailyGross:          results.dailyGross,
        hourlyEquivalent:    results.hourlyEquivalent,
        annualDeductions:    results.annualDeductions,
        annualTakeHome:      results.annualTakeHome,
        takeHomePerPeriod:   results.takeHomePerPeriod,
        effectiveHourlyRate: results.effectiveHourlyRate,
        takeHomePct:         results.takeHomePct,
        periodsPerYear:      results.periodsPerYear,
        payFreqLabel:        results.payFreqLabel,
        payClarityScore,
        clarityLabel,
        region:              isCA ? 'ca' : 'us',
      });
    } finally {
      setPdfLoading(false);
    }
  }

  // Conversion rows — all 7 periods including Daily and Hourly
  const conversionRows: Array<{ label: string; value: number; freq: PayFreq | null; periods: string; suffix?: string }> = results
    ? [
        { label: 'Annual',       value: results.annualGross,      freq: null,            periods: '1× per year' },
        { label: 'Monthly',      value: results.monthlyGross,     freq: 'Monthly',       periods: '12× per year' },
        { label: 'Semi-monthly', value: results.semiMonthlyGross, freq: 'Semi-monthly',  periods: '24× per year' },
        { label: 'Biweekly',     value: results.biweeklyGross,    freq: 'Biweekly',      periods: '26× per year' },
        { label: 'Weekly',       value: results.weeklyGross,      freq: 'Weekly',        periods: `${formatPeriods(parseFloat(form.weeksPerYear) || 0)}× per year` },
        { label: 'Daily',        value: results.dailyGross,       freq: null,            periods: '5-day week' },
        { label: 'Hourly',       value: results.hourlyEquivalent, freq: null,            periods: 'per hour', suffix: '/hr' },
      ]
    : [];

  return (
    <div className="flex flex-col gap-y-6 md:gap-y-7 min-w-0">

      <style>{`
        @keyframes teal-glow-salary {
          0%, 100% { box-shadow: 0 0 0 1px rgba(29,181,132,0.3), 0 0 14px rgba(29,181,132,0.12); }
          50%       { box-shadow: 0 0 0 1px rgba(29,181,132,0.6), 0 0 26px rgba(29,181,132,0.28); }
        }
        .btn-ai-cta-salary {
          animation: teal-glow-salary 2.8s ease-in-out infinite;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .btn-ai-cta-salary:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 0 1px rgba(29,181,132,0.75), 0 0 32px rgba(29,181,132,0.38) !important;
          animation: none;
        }
        .sal-type-pills { display: flex; flex-wrap: wrap; gap: 7px; }
        .sal-type-pill  { flex: 1; min-width: calc(33.33% - 6px); text-align: center; }
        @media (min-width: 540px) { .sal-type-pill { min-width: 0; } }
        .sal-freq-pills { display: flex; flex-wrap: wrap; gap: 7px; }
        .sal-freq-pill  { flex: 1; min-width: calc(50% - 4px); text-align: center; }
        @media (min-width: 540px) { .sal-freq-pill { min-width: 0; } }
      `}</style>

      {/* ══ Block A: Input + Results ════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">

        {/* ── Input Card ────────────────────────────────────────────────── */}
        <div className="lg:col-span-7 lg:self-start" style={cardStyle}>
          <div className="p-5 md:p-6">

            {/* Card header */}
            <div className="flex items-center gap-3 mb-5">
              <div style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: 'linear-gradient(135deg,#1DB584 0%,#0fa36e 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(29,181,132,0.30)',
              }}>
                <Briefcase size={15} color="white" strokeWidth={2.2} aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                  Tax &amp; Salary
                </p>
                <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>Salary Details</p>
              </div>
            </div>

            {/* 2×2 input grid */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-3 md:gap-x-5 mb-5">
              <div>
                <label className={navyLabelCls} style={navyLabelStyle}>
                  Salary Amount
                  <Tooltip text="Enter your salary. Choose the type below — Annual, Monthly, Biweekly, Weekly, or Hourly." />
                </label>
                <NumericInput
                  value={form.salaryAmount}
                  onChange={(v) => set('salaryAmount', v)}
                  prefix={currencyPrefix}
                  inputClassName={inputClsCompact}
                />
              </div>
              <div>
                <label className={navyLabelCls} style={navyLabelStyle}>
                  Hours per Week
                  <Tooltip text="Standard full-time is 40 hours/week. Used to calculate your effective hourly rate." />
                </label>
                <NumericInput
                  value={form.hoursPerWeek}
                  onChange={(v) => set('hoursPerWeek', v)}
                  suffix="hr"
                  inputClassName={inputClsCompact}
                />
              </div>
              <div>
                <label className={navyLabelCls} style={navyLabelStyle}>
                  Weeks per Year
                  <Tooltip text="Typically 52 for salaried employees. Adjust for contract roles or unpaid leave." />
                </label>
                <NumericInput
                  value={form.weeksPerYear}
                  onChange={(v) => set('weeksPerYear', v)}
                  suffix="wk"
                  inputClassName={inputClsCompact}
                />
              </div>
              <div>
                <label className={navyLabelCls} style={navyLabelStyle}>
                  Est. Deduction Rate
                  <Tooltip text="Your estimated combined deduction rate — income tax, CPP/EI or FICA, benefits, etc. This is a user-entered estimate, not an official tax calculation." />
                </label>
                <NumericInput
                  value={form.deductionRate}
                  onChange={(v) => set('deductionRate', v)}
                  suffix="%"
                  inputClassName={inputClsCompact}
                />
                <p className="mt-0.5 text-[10px]" style={{ color: '#9BA8B5' }}>Estimate — adjust for your situation</p>
              </div>
            </div>

            {/* Divider */}
            <div className="mb-4" style={{ height: 1, background: 'rgba(15,41,66,0.07)' }} />

            {/* Salary Type — full width pills */}
            <div className="mb-4">
              <label className={navyLabelCls} style={navyLabelStyle}>
                Salary Type
                <Tooltip text="Select whether your salary amount is entered as annual, monthly, biweekly, weekly, or hourly pay." />
              </label>
              <div className="sal-type-pills">
                {SALARY_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="sal-type-pill font-semibold text-xs py-2 rounded-lg transition-colors duration-150"
                    onClick={() => setSalaryType(t)}
                    style={pillStyle(salaryType === t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Pay Frequency — full width pills */}
            <div>
              <label className={navyLabelCls} style={navyLabelStyle}>
                Pay Frequency
                <Tooltip text="How often you receive a paycheque. This sets the take-home per period shown in your results." />
              </label>
              <div className="sal-freq-pills">
                {PAY_FREQS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className="sal-freq-pill font-semibold text-xs py-2 rounded-lg transition-colors duration-150"
                    onClick={() => setPayFreq(f)}
                    style={pillStyle(payFreq === f)}
                  >
                    {f === 'Semi-monthly' ? 'Semi-mo' : f}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Mobile CTA */}
        <div className="lg:hidden">
          <MobileCalcCTA />
        </div>

        {/* ── Results Card ───────────────────────────────────────────────── */}
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
            {!results && (
              <div className="flex flex-1 items-center justify-center py-12">
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px', textAlign: 'center', lineHeight: 1.7 }}>
                  Enter your salary to see your pay breakdown.
                </p>
              </div>
            )}

            {results && (
              <div className="flex flex-col flex-1 gap-4">

                {/* Hero */}
                <div className="rounded-xl p-4"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
                    Est. Take-Home ({results.payFreqLabel})
                  </p>
                  <p style={{ color: '#1DB584', fontSize: '36px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, marginTop: 6 }}>
                    {fmtx(results.takeHomePerPeriod)}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: 5, fontWeight: 500 }}>
                    {formatPeriods(results.periodsPerYear)} paycheques/year · est. {results.takeHomePct.toFixed(0)}% take-home
                  </p>
                </div>

                {/* Stat rows */}
                <div className="px-1 divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  {[
                    { label: 'Annual Gross Pay',       value: fmt(results.annualGross),                     color: '#CBD5E1' as const, bold: false },
                    { label: 'Est. Annual Take-Home',   value: fmt(results.annualTakeHome),                  color: '#1DB584' as const, bold: true  },
                    { label: 'Est. Annual Deductions',  value: fmt(results.annualDeductions),                color: '#F59E0B' as const, bold: false },
                    { label: 'Effective Hourly Rate',   value: fmtx(results.effectiveHourlyRate) + '/hr',    color: '#CBD5E1' as const, bold: false },
                    { label: 'Deduction Rate',          value: `${parseFloat(form.deductionRate) || 0}%`,    color: '#CBD5E1' as const, bold: false },
                  ].map(({ label, value, color, bold }) => (
                    <div key={label} className="flex items-center justify-between py-1.5">
                      <span className="text-[13px]" style={{ color: '#CBD5E1' }}>{label}</span>
                      <span className="text-[13px]" style={{ color, fontWeight: bold ? 700 : 600 }}>{value}</span>
                    </div>
                  ))}
                </div>

                <div style={{ height: 1, background: 'rgba(255,255,255,0.12)' }} />

                {/* CTA */}
                <div className="pt-1">
                  <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.52)', marginBottom: 8, fontStyle: 'italic' }}>
                    See how your salary translates to take-home and hourly pay.
                  </p>
                  <button
                    className="btn-ai-cta-salary w-full font-bold overflow-hidden"
                    onClick={scrollToAI}
                    onMouseEnter={() => setAiCtaHovered(true)}
                    onMouseLeave={() => setAiCtaHovered(false)}
                    style={{
                      position: 'relative', background: '#060F1A', color: '#ffffff',
                      borderRadius: 8, height: 40, fontSize: '13px',
                      border: '1px solid rgba(29,181,132,0.4)',
                    }}
                  >
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', opacity: aiCtaHovered ? 0 : 1, transition: 'opacity 200ms ease', pointerEvents: 'none' }}>
                      Review Salary Insights ↓
                    </span>
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', opacity: aiCtaHovered ? 1 : 0, transition: 'opacity 200ms ease', pointerEvents: 'none' }}>
                      <Sparkles size={13} style={{ marginRight: 6, color: '#1DB584' }} aria-hidden />
                      See AI Salary Analysis ↓
                    </span>
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>{/* end Block A */}

      {/* ══ Block B: Pay Conversion + Take-Home Breakdown ═══════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">

        {/* ── Gross Pay Conversion ──────────────────────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Pay Conversion
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Gross Pay by Period</h3>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(13,27,42,0.45)' }}>
                Your selected pay frequency is highlighted
              </p>
            </div>

            {!results && (
              <div className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}>
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter your salary to see pay conversions.
                </p>
              </div>
            )}

            {results && (() => {
              // Annual = 100% reference for log-scale bar widths
              const logRef = Math.log(Math.max(results.annualGross, 1));
              return (
                <div className="flex flex-col flex-1" style={{ gap: 3 }}>
                  {conversionRows.map(({ label, value, freq, periods, suffix }) => {
                    const isSelected = freq === payFreq;
                    const barPct = logRef > 0
                      ? Math.max(8, Math.round((Math.log(Math.max(value, 1)) / logRef) * 100))
                      : 8;
                    const displayValue = suffix ? fmtx(value) + suffix : fmt(value);
                    return (
                      <div
                        key={label}
                        className="flex items-center"
                        style={{
                          minHeight: 46,
                          paddingRight: 14,
                        }}
                      >
                        {/* Label column — right-aligned, fixed width */}
                        <div style={{ width: 128, minWidth: 128, paddingRight: 12, paddingLeft: 10, textAlign: 'right' }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              lineHeight: 1.2,
                              color: isSelected ? '#1DB584' : '#374151',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {label}
                          </div>
                          <div style={{ fontSize: 10, color: isSelected ? 'rgba(29,181,132,0.60)' : '#94a3b8', marginTop: 2 }}>
                            {periods}
                          </div>
                        </div>

                        {/* Vertical divider */}
                        <div style={{
                          width: 1,
                          alignSelf: 'stretch',
                          background: 'rgba(15,41,66,0.08)',
                          flexShrink: 0,
                          marginTop: 10,
                          marginBottom: 10,
                        }} />

                        {/* Bar column */}
                        <div className="flex-1 flex items-center" style={{ paddingLeft: 12, paddingRight: 10, minWidth: 0 }}>
                          {/* Bar track — transparent, no overflow-hidden so outline on inner bar isn't clipped */}
                          <div className="w-full" style={{ height: 13, position: 'relative' }}>
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${barPct}%`,
                                background: isSelected
                                  ? 'linear-gradient(90deg, #1DB584 0%, #22dba0 100%)'
                                  : '#D1D9E0',
                                outline: isSelected ? '1.5px solid rgba(29,181,132,0.45)' : 'none',
                                outlineOffset: isSelected ? '4px' : '0',
                              }}
                            />
                          </div>
                        </div>

                        {/* Amount column — right-aligned, fixed width */}
                        <div
                          className="tabular-nums shrink-0"
                          style={{
                            width: 78,
                            textAlign: 'right',
                            fontSize: isSelected ? 15 : 13,
                            fontWeight: isSelected ? 800 : 600,
                            color: isSelected ? '#1DB584' : '#111827',
                            letterSpacing: isSelected ? '-0.4px' : '0',
                          }}
                        >
                          {displayValue}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── Estimated Pay Breakdown (donut) ───────────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 h-full flex flex-col">
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                Breakdown
              </p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Estimated Pay Breakdown</h3>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(13,27,42,0.45)' }}>
                Annual gross split into take-home and deductions
              </p>
            </div>

            {(!results || !donutSlices) && (
              <div className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}>
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>
                  Enter your salary to see the breakdown.
                </p>
              </div>
            )}

            {results && donutSlices && (
              <div className="flex flex-col md:flex-row items-center gap-4 flex-1">
                <div className="shrink-0">
                  <DonutChart
                    slices={donutSlices}
                    className="w-52 h-52"
                    centerValue={fmt(results.annualTakeHome)}
                    centerLabel="take-home / yr"
                  />
                </div>
                <div className="w-full md:flex-1 divide-y" style={{ borderColor: 'rgba(15,41,66,0.07)' }}>
                  {[
                    { label: 'Annual Gross Pay',      value: results.annualGross,      color: '#CBD5E1', pctOf: results.annualGross },
                    { label: 'Est. Deductions',       value: results.annualDeductions,  color: '#F59E0B', pctOf: results.annualGross },
                    { label: 'Est. Annual Take-Home', value: results.annualTakeHome,    color: '#1DB584', pctOf: results.annualGross },
                  ].map(({ label, value, color, pctOf }) => {
                    const pct = pctOf > 0 ? Math.round((value / pctOf) * 100) : 0;
                    return (
                      <div key={label} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                          <span style={{ color: '#4B5563', fontSize: '12.5px' }}>{label}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-slate-400">{pct}%</span>
                          <span className="font-semibold" style={{ color: '#0D1B2A', fontSize: '12.5px' }}>{fmt(value)}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2">
                    <p className="text-[10px] italic" style={{ color: '#9BA8B5' }}>
                      Estimate only — actual deductions vary by country, province/state, and payroll setup.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>{/* end Block B */}

      {/* ══ Block C: AI Analysis ════════════════════════════════════════════ */}
      <div
        id="ai-analysis"
        className="overflow-hidden"
        style={{ ...cardStyle, padding: 0, scrollMarginTop: '80px' }}
      >

        {/* Dark header */}
        <div
          className="px-4 md:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #0f2744 100%)' }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center shrink-0"
              style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(29,181,132,0.18)' }}>
              <Sparkles className="w-4 h-4" style={{ color: '#1DB584' }} aria-hidden />
            </span>
            <div>
              <p className="text-white text-lg md:text-xl font-bold tracking-tight">
                FinCalc <span style={{ color: '#1DB584' }}>Smart</span> AI Salary Analysis
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.40)' }}>
                AI-assisted insights by FinCalc Smart
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={!results || pdfLoading}
              className="inline-flex items-center gap-1.5"
              style={{ background: '#1DB584', color: '#fff', borderRadius: 9999, padding: '7px 16px', fontSize: '13px', fontWeight: 700, opacity: (!results || pdfLoading) ? 0.55 : 1, cursor: (!results || pdfLoading) ? 'not-allowed' : 'pointer' }}>
              <Download className="w-3.5 h-3.5 shrink-0" aria-hidden />
              {pdfLoading ? 'Generating…' : 'Download PDF'}
            </button>
            <button disabled aria-disabled="true" title="Coming soon"
              className="inline-flex items-center gap-1.5 cursor-not-allowed select-none"
              style={{ border: '1.5px solid rgba(255,255,255,0.30)', color: 'rgba(255,255,255,0.78)', background: 'rgba(255,255,255,0.06)', borderRadius: 9999, padding: '7px 16px', fontSize: '13px', fontWeight: 700 }}>
              <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden />
              Email Results
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 md:p-5" style={{ background: '#f4f6f9' }}>

          {!results && (
            <div className="flex flex-col items-center justify-center py-10 rounded-2xl gap-3"
              style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.08)' }}>
              <Sparkles className="w-5 h-5" style={{ color: '#1DB584' }} aria-hidden />
              <p className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>
                Enter your salary above to get AI insights.
              </p>
              <p className="text-xs text-center px-4" style={{ color: '#94a3b8', maxWidth: 340 }}>
                Your Pay Clarity Score, effective hourly rate, and deduction context will appear here.
              </p>
            </div>
          )}

          {results && (() => {
            const deductRate = parseFloat(form.deductionRate) || 0;

            // Gauge math — 240° sweep, GR=68
            const GR = 68;
            const GC = 2 * Math.PI * GR;
            const GARC = (240 / 360) * GC;
            const GFIL = GARC * (payClarityScore / 100);

            // Lever copy
            const showHourlyLever = deductRate === 0;
            const leverBigNum = showHourlyLever
              ? fmtx(results.hourlyEquivalent) + '/hr'
              : fmtx(results.takeHomePerPeriod);
            const leverTitle = showHourlyLever
              ? 'Gross Hourly Equivalent'
              : `Est. Take-Home — ${payFreq}`;
            const leverSub = showHourlyLever
              ? `Based on ${form.hoursPerWeek} hrs/week × ${form.weeksPerYear} weeks. Enter a deduction rate to see estimated take-home.`
              : `At ${deductRate}% estimated deductions, you keep ${results.takeHomePct.toFixed(0)}% of gross. ${fmt(results.annualGross)} gross → ${fmt(results.annualTakeHome)} annual take-home.`;

            // Insight card helpers
            const freqPeriods: Record<PayFreq, string> = {
              'Monthly': '12 paycheques per year.',
              'Semi-monthly': '24 paycheques per year (twice per month — differs from biweekly).',
              'Biweekly': '26 paycheques per year — two months per year have 3 paycheques.',
              'Weekly': `${formatPeriods(results.periodsPerYear)} paycheques per year.`,
            };
            const freqGross: Record<PayFreq, number> = {
              'Monthly':      results.monthlyGross,
              'Semi-monthly': results.semiMonthlyGross,
              'Biweekly':     results.biweeklyGross,
              'Weekly':       results.weeklyGross,
            };

            const deductLow   = deductRate < 20;
            const deductHigh  = deductRate > 35;
            const deductBg    = deductHigh ? '#FEF2F2' : deductLow ? '#ECFDF5' : '#FFFBEB';
            const deductBord  = deductHigh ? '#FECACA' : deductLow ? '#A7F3D0' : '#FDE68A';
            const deductLabel = deductHigh ? 'text-red-600'     : deductLow ? 'text-emerald-600' : 'text-amber-600';
            const deductIconBg= deductHigh ? '#fee2e2'          : deductLow ? '#dcfce7'          : '#fef3c7';

            return (
              <>
                {/* ── Row 1: Pay Clarity + Smart Lever ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                  {/* Left — Pay Clarity Score */}
                  <div className="rounded-2xl p-4 flex flex-col"
                    style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.09)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                        <span className="text-sm font-bold text-slate-800">Pay Clarity Score</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                        style={{ background: clarityBg, color: clarityColor }}>
                        {clarityLabel}
                      </span>
                    </div>

                    {/* Large centered gauge */}
                    <div className="flex flex-col items-center flex-1">
                      {/* Gauge */}
                      <div style={{ position: 'relative', width: 200, height: 200, flexShrink: 0 }}>
                        <svg viewBox="0 0 180 180" width="200" height="200" style={{ display: 'block' }} aria-hidden>
                          <circle cx="90" cy="90" r={GR} fill="none"
                            stroke="rgba(15,41,66,0.09)" strokeWidth="12" strokeLinecap="round"
                            strokeDasharray={`${GARC.toFixed(1)} ${(GC - GARC).toFixed(1)}`}
                            transform="rotate(150, 90, 90)"
                          />
                          <circle cx="90" cy="90" r={GR} fill="none"
                            stroke={clarityColor} strokeWidth="12" strokeLinecap="round"
                            strokeDasharray={`${GFIL.toFixed(1)} ${(GC - GFIL).toFixed(1)}`}
                            transform="rotate(150, 90, 90)"
                            style={{ transition: 'stroke-dasharray 0.9s ease' }}
                          />
                        </svg>
                        {/* Score centered in arc */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: 20 }}>
                          <span style={{ fontSize: 'clamp(2.4rem, 6vw, 3.2rem)', fontWeight: 800, color: '#0D1B2A', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                            {payClarityScore}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500, lineHeight: 1.6 }}>/100</span>
                        </div>
                      </div>

                      {/* Keep % line */}
                      <p className="text-center mt-1 mb-1" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(13,27,42,0.50)' }}>
                        You keep <span style={{ color: clarityColor, fontWeight: 700 }}>{results.takeHomePct.toFixed(0)}%</span> of gross pay
                      </p>

                      {/* 3-stat row */}
                      <div className="grid grid-cols-3 gap-3 w-full mt-2">
                        {[
                          { label: 'Take-Home', value: fmt(results.annualTakeHome), color: '#1DB584', bg: 'rgba(29,181,132,0.08)', border: 'rgba(29,181,132,0.22)' },
                          { label: 'Deductions', value: fmt(results.annualDeductions), color: '#D97706', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)' },
                          { label: 'Gross Pay', value: fmt(results.annualGross), color: '#1e3a5f', bg: 'rgba(15,41,66,0.05)', border: 'rgba(15,41,66,0.11)' },
                        ].map(({ label, value, color, bg, border }) => (
                          <div key={label} className="rounded-xl text-center"
                            style={{ background: bg, border: `1px solid ${border}`, padding: '10px 6px 10px' }}>
                            <p style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>
                              {label}
                            </p>
                            <p style={{ fontSize: '13px', fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.2px' }}>
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>

                      <p className="text-slate-400 mt-3 text-center" style={{ fontSize: '11px', lineHeight: 1.55 }}>
                        {deductRate === 0
                          ? 'No deduction rate entered. Add an estimated rate to see take-home strength.'
                          : clarityLabel === 'Low Deduction Load'
                            ? `At ${deductRate}% deductions, you retain a strong share of your gross pay.`
                            : clarityLabel === 'Moderate Deduction Load'
                              ? `At ${deductRate}% deductions, your take-home is moderate — typical for many mid-income earners.`
                              : `At ${deductRate}% deductions, a significant portion goes to taxes and other payroll deductions.`
                        }
                      </p>
                    </div>
                  </div>

                  {/* Right — Smart Lever */}
                  <div className="rounded-2xl p-4 flex flex-col"
                    style={{ background: 'linear-gradient(145deg, #0D1B2A 0%, #0c1e3a 100%)', border: '1px solid rgba(29,181,132,0.15)', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                      <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#1DB584' }}>
                        {showHourlyLever ? 'Hourly Equivalent' : 'Deduction Impact'}
                      </span>
                    </div>

                    {/* Content centred in remaining space */}
                    <div className="flex flex-col justify-center flex-1">

                    {/* Main number block */}
                    <div className="rounded-xl flex flex-col items-center justify-center px-4 py-5 mb-3"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                      <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.40)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
                        {leverTitle}
                      </p>
                      <span className="font-extrabold tabular-nums"
                        style={{ fontSize: 'clamp(1.9rem, 5vw, 2.6rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                        {leverBigNum}
                      </span>
                    </div>

                    {/* Secondary stats */}
                    <div className="grid grid-cols-2 gap-2.5 mb-3">
                      <div className="flex flex-col justify-center rounded-xl px-3 py-2.5"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                        <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '0.95rem', lineHeight: 1.2 }}>
                          {fmt(results.annualGross)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                          <span className="text-slate-400 text-xs">Annual gross</span>
                        </div>
                      </div>
                      <div className="flex flex-col justify-center rounded-xl px-3 py-2.5"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                        <div className="text-white font-bold tabular-nums mb-1" style={{ fontSize: '0.95rem', lineHeight: 1.2 }}>
                          {fmtx(results.effectiveHourlyRate)}<span className="text-slate-400 font-normal text-xs">/hr</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                          <span className="text-slate-400 text-xs">Eff. hourly</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] italic leading-relaxed" style={{ color: 'rgba(255,255,255,0.30)' }}>
                      {leverSub}
                    </p>

                    </div>{/* end centred content */}
                  </div>

                </div>{/* end Row 1 */}

                {/* ── Row 2: Three insight cards ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  {/* Pay Frequency Check */}
                  <div className="rounded-2xl p-4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="flex items-center justify-center shrink-0"
                        style={{ width: 28, height: 28, borderRadius: 8, background: '#e0f2fe' }}>
                        <Clock className="w-3.5 h-3.5 text-sky-600" aria-hidden />
                      </span>
                      <p className="text-xs font-bold text-sky-700">Pay Frequency</p>
                    </div>
                    <p className="text-[13px] font-bold text-sky-800 mb-1">{payFreq}</p>
                    <p className="text-[12px] text-slate-600 leading-relaxed">
                      {freqPeriods[payFreq]}{' '}
                      Your {fmtx(freqGross[payFreq])} gross becomes{' '}
                      <strong className="text-sky-700">{fmtx(results.takeHomePerPeriod)}</strong> estimated take-home per paycheque.
                    </p>
                  </div>

                  {/* Deduction Estimate */}
                  <div className="rounded-2xl p-4" style={{ background: deductBg, border: `1px solid ${deductBord}` }}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="flex items-center justify-center shrink-0"
                        style={{ width: 28, height: 28, borderRadius: 8, background: deductIconBg }}>
                        <AlertTriangle className={`w-3.5 h-3.5 ${deductLabel}`} aria-hidden />
                      </span>
                      <p className={`text-xs font-bold ${deductLabel}`}>Deduction Estimate</p>
                    </div>
                    <p className={`text-[13px] font-bold mb-1 ${deductLabel}`}>{deductRate}% entered</p>
                    <p className="text-[12px] text-slate-600 leading-relaxed">
                      {deductRate === 0
                        ? 'No deduction rate entered. Many earners estimate 20–35%, but your actual deductions depend on your country, province/state, and payroll setup.'
                        : deductLow
                          ? `${deductRate}% is below the 20–35% range many earners use as a rough guide. Verify this reflects your tax and payroll situation.`
                          : deductHigh
                            ? `${deductRate}% is above the typical 20–35% range. This may reflect a higher bracket or additional deductions. Many earners estimate 20–35%, but your actual deductions may differ.`
                            : `${deductRate}% is within the 20–35% range many earners use as a rough estimate. Actual deductions depend on your country, province/state, and filing status.`
                      }
                    </p>
                  </div>

                  {/* Hourly Value */}
                  <div className="rounded-2xl p-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="flex items-center justify-center shrink-0"
                        style={{ width: 28, height: 28, borderRadius: 8, background: '#dcfce7' }}>
                        <Clock className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
                      </span>
                      <p className="text-xs font-bold text-emerald-700">Hourly Value</p>
                    </div>
                    <p className="text-[13px] font-bold text-emerald-800 mb-1">{fmtx(results.hourlyEquivalent)}/hr gross</p>
                    <p className="text-[12px] text-slate-600 leading-relaxed">
                      Your {fmt(results.annualGross)} annual salary equals{' '}
                      <strong className="text-emerald-700">{fmtx(results.hourlyEquivalent)}/hr</strong> gross
                      at {form.hoursPerWeek} hrs/week.
                      {deductRate > 0
                        ? <> After {deductRate}% estimated deductions, your effective take-home rate is{' '}
                          <strong className="text-emerald-700">{fmtx(results.effectiveHourlyRate)}/hr</strong>.</>
                        : ' Enter a deduction rate to see your effective hourly take-home.'
                      }
                    </p>
                  </div>

                </div>{/* end Row 2 */}

                {/* Stat grid */}
                <div className="mt-4 rounded-2xl p-4"
                  style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.08)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#1DB584' }}>
                    {salaryType} Pay Summary
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Annual Gross',   value: fmt(results.annualGross) },
                      { label: 'Monthly Gross',  value: fmt(results.monthlyGross) },
                      { label: 'Biweekly Gross', value: fmt(results.biweeklyGross) },
                      { label: 'Weekly Gross',   value: fmt(results.weeklyGross) },
                      { label: 'Daily Gross',    value: fmtx(results.dailyGross) },
                      { label: 'Hourly (gross)', value: fmtx(results.hourlyEquivalent) + '/hr' },
                      { label: 'Est. Take-Home', value: fmt(results.annualTakeHome) },
                      { label: 'Eff. Hourly',    value: fmtx(results.effectiveHourlyRate) + '/hr' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9BA8B5', marginBottom: 2 }}>{label}</p>
                        <p style={{ fontSize: '13px', fontWeight: 800, color: '#0D1B2A', lineHeight: 1 }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </>
            );
          })()}

        </div>{/* end body */}

        {/* Inner disclaimer */}
        <div className="flex items-start gap-2.5 px-5 md:px-6 py-4"
          style={{ borderTop: '1px solid rgba(15,41,66,0.07)', background: '#f8fafb' }}>
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden />
          <p className="text-slate-400 text-xs leading-relaxed">
            <strong className="text-slate-500 font-semibold">Disclaimer:</strong>{' '}
            This analysis is for educational and illustrative purposes only. The deduction rate is a user-entered estimate and does not reflect official tax brackets or specific payroll deductions. Actual take-home pay depends on your country, province/state, tax year, filing status, and employer setup.
          </p>
        </div>

      </div>{/* end Block C */}

      {/* ══ How It Works ══════════════════════════════════════════════════════ */}
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

      {/* ══ FAQ ═══════════════════════════════════════════════════════════════ */}
      {faqItems.length > 0 && (
        <div style={cardStyle} className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
            Frequently Asked Questions
          </h2>
          <CalculatorFaqAccordion faqs={faqItems} />
        </div>
      )}

      {/* ══ Bottom disclaimer ════════════════════════════════════════════════ */}
      <p className="text-xs text-slate-400 text-center mt-4 pb-12 px-4 leading-relaxed max-w-4xl mx-auto">
        This calculator is for educational and illustrative purposes only. Actual take-home pay depends on country,
        province/state, tax year, filing status, payroll deductions, employee benefits, tax credits, retirement
        contributions, and employer setup. The deduction rate is user-entered and does not reflect official tax
        brackets, CPP, EI, FICA, Medicare, or other specific payroll deductions. This is not financial, tax,
        payroll, or legal advice.
      </p>

    </div>
  );
}
