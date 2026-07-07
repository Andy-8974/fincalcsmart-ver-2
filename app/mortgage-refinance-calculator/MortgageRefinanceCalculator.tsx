'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useRegion } from '@/lib/region/context';
import {
  monthlyRateCA, monthlyRateUS, calcPayment,
  fmtCAD, fmtCADx, fmtUSD, fmtUSDx,
} from '@/app/_mortgage-shared/math';
import { NumericInput, Tooltip } from '@/app/_mortgage-shared/ui';
import MobileCalcCTA from '@/components/ui/MobileCalcCTA';
import CalculatorFaqAccordion from '@/components/layout/CalculatorFaqAccordion';
import {
  AlertTriangle, BookOpen, Clock, Download, HelpCircle,
  Mail, RefreshCw, ShieldAlert, Sparkles, TrendingDown, TrendingUp,
} from 'lucide-react';
import { buildMortgageRefinancePDF } from '@/lib/pdf/adapters/mortgageRefinanceAdapter';

// ─── Types ────────────────────────────────────────────────────────────────────

type NewAmort = 10 | 15 | 20 | 25 | 30;
type Horizon  = 3 | 5 | 7 | 10;
type Decision = 'saves' | 'no-break-even' | 'costs-more';

interface FormState {
  currentBalance:  string;
  currentRate:     string;
  yearsRemaining:  string;
  newRate:         string;
  refinanceCosts:  string;
  cashOut:         string;
}

interface Results {
  paymentCurr:           number;
  paymentNew:            number;
  monthlySavings:        number;
  newPrincipal:          number;
  refinanceCosts:        number;
  breakEvenMonths:       number | null;
  totalInterestCurrH:    number;
  totalInterestNewH:     number;
  totalInterestDiff:     number;
  netSavingsOverHorizon: number;
  decision:              Decision;
  termExtended:          boolean;
  yearsRemaining:        number;
  newAmortization:       number;
  horizonYears:          number;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: FormState = {
  currentBalance:  '450000',
  currentRate:     '5.75',
  yearsRemaining:  '20',
  newRate:         '4.99',
  refinanceCosts:  '3000',
  cashOut:         '0',
};

const AMORT_OPTIONS: NewAmort[] = [10, 15, 20, 25, 30];
const HORIZON_OPTIONS: Horizon[] = [3, 5, 7, 10];

// ─── Decision config ──────────────────────────────────────────────────────────

const DC = {
  saves:           { color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', darkBg: 'rgba(16,185,129,0.18)', darkBorder: 'rgba(16,185,129,0.45)', label: 'Refinancing May Reduce Cost' },
  'no-break-even': { color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', darkBg: 'rgba(245,158,11,0.18)', darkBorder: 'rgba(245,158,11,0.45)', label: 'Break-even Beyond Horizon' },
  'costs-more':    { color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', darkBg: 'rgba(239,68,68,0.18)', darkBorder: 'rgba(239,68,68,0.45)', label: 'New Payment Would Be Higher' },
} as const;

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
  .replace('py-2.5', 'py-1 md:py-2')
  .replace('px-3', 'pr-2 md:pr-3 pl-3');

const navyLabelStyle: React.CSSProperties = {
  fontWeight: 700, color: '#0D1B2A',
  display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4,
};
const navyLabelCls = 'text-[10px] md:text-xs';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MortgageRefinanceCalculator({
  formulaContent,
  faqItems = [],
}: {
  formulaContent?: ReactNode;
  faqItems?: Array<{ question: string; answer: string }>;
}) {
  const { region } = useRegion();
  const isCA = region === 'ca';
  const fmt  = isCA ? fmtCAD  : fmtUSD;
  const fmtx = isCA ? fmtCADx : fmtUSDx;
  const moneyPrefix = isCA ? 'CA$' : '$';

  const [form, setForm]                  = useState<FormState>(DEFAULTS);
  const [newAmortization, setNewAmort]   = useState<NewAmort>(25);
  const [horizonYears, setHorizon]       = useState<Horizon>(5);
  const [aiCtaHovered, setAiCtaHovered] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  function set<K extends keyof FormState>(field: K, value: string) {
    setForm(p => ({ ...p, [field]: value }));
  }

  function scrollToAI() {
    const el = document.getElementById('ai-analysis');
    if (!el) return;
    const navH = (document.querySelector('header') as HTMLElement | null)?.getBoundingClientRect().height ?? 64;
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - navH - 16), behavior: 'smooth' });
  }

  // ─── Math ─────────────────────────────────────────────────────────────────

  const results = useMemo<Results | null>(() => {
    const cb = parseFloat(form.currentBalance) || 0;
    if (cb <= 0) return null;
    const cr = parseFloat(form.currentRate) || 0;
    if (cr <= 0 || cr > 30) return null;
    const yr = parseFloat(form.yearsRemaining) || 0;
    if (yr < 0.5 || yr > 40) return null;
    const nr = parseFloat(form.newRate) || 0;
    if (nr <= 0 || nr > 30) return null;

    const refinanceCosts = Math.max(0, parseFloat(form.refinanceCosts) || 0);
    const cashOut        = Math.max(0, parseFloat(form.cashOut) || 0);
    const newPrincipal   = cb + cashOut;

    const mRateCurr = isCA ? monthlyRateCA(cr) : monthlyRateUS(cr);
    const mRateNew  = isCA ? monthlyRateCA(nr) : monthlyRateUS(nr);

    const nCurr = Math.round(yr * 12);
    const nNew  = newAmortization * 12;

    const paymentCurr = calcPayment(cb,          mRateCurr, nCurr);
    const paymentNew  = calcPayment(newPrincipal, mRateNew,  nNew);

    const monthlySavings = paymentCurr - paymentNew;

    const breakEvenMonths: number | null =
      monthlySavings > 0 && refinanceCosts === 0 ? 0
      : monthlySavings > 0                       ? Math.ceil(refinanceCosts / monthlySavings)
      : null;

    const horizonMonths = horizonYears * 12;
    const netSavingsOverHorizon = monthlySavings * horizonMonths - refinanceCosts;

    // Monthly interest loop over horizon
    let totalInterestCurrH = 0, totalInterestNewH = 0;
    let balC = cb, balN = newPrincipal;
    for (let m = 1; m <= horizonMonths; m++) {
      if (balC > 0.01) {
        const intC = balC * mRateCurr;
        totalInterestCurrH += intC;
        balC = Math.max(0, balC - Math.min(paymentCurr - intC, balC));
      }
      if (balN > 0.01) {
        const intN = balN * mRateNew;
        totalInterestNewH += intN;
        balN = Math.max(0, balN - Math.min(paymentNew - intN, balN));
      }
    }

    const totalInterestDiff = totalInterestCurrH - totalInterestNewH;
    const termExtended = newAmortization > Math.ceil(yr);

    let decision: Decision;
    if (monthlySavings <= 0) {
      decision = 'costs-more';
    } else if (breakEvenMonths !== null && breakEvenMonths <= horizonMonths) {
      decision = 'saves';
    } else {
      decision = 'no-break-even';
    }

    return {
      paymentCurr, paymentNew, monthlySavings,
      newPrincipal, refinanceCosts,
      breakEvenMonths, totalInterestCurrH, totalInterestNewH,
      totalInterestDiff, netSavingsOverHorizon,
      decision, termExtended,
      yearsRemaining: yr, newAmortization, horizonYears,
    };
  }, [form, newAmortization, horizonYears, isCA]);

  const dc = results ? DC[results.decision] : null;

  async function handleDownloadPDF() {
    if (!results || pdfLoading) return;
    setPdfLoading(true);
    try {
      await buildMortgageRefinancePDF({
        currentBalance:        parseFloat(form.currentBalance)  || 0,
        currentRate:           parseFloat(form.currentRate)     || 0,
        yearsRemaining:        results.yearsRemaining,
        newRate:               parseFloat(form.newRate)         || 0,
        newAmortization:       results.newAmortization,
        refinanceCosts:        results.refinanceCosts,
        cashOut:               parseFloat(form.cashOut)         || 0,
        horizonYears:          results.horizonYears,
        paymentCurr:           results.paymentCurr,
        paymentNew:            results.paymentNew,
        monthlySavings:        results.monthlySavings,
        newPrincipal:          results.newPrincipal,
        breakEvenMonths:       results.breakEvenMonths,
        totalInterestCurrH:    results.totalInterestCurrH,
        totalInterestNewH:     results.totalInterestNewH,
        totalInterestDiff:     results.totalInterestDiff,
        netSavingsOverHorizon: results.netSavingsOverHorizon,
        decision:              results.decision,
        termExtended:          results.termExtended,
        region,
      });
    } catch (e) {
      console.error('PDF generation failed', e);
    } finally {
      setPdfLoading(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-y-7 md:gap-y-8 min-w-0">

      <style>{`
        @keyframes teal-glow-refi {
          0%, 100% { box-shadow: 0 0 0 1px rgba(29,181,132,0.3), 0 0 14px rgba(29,181,132,0.12); }
          50%       { box-shadow: 0 0 0 1px rgba(29,181,132,0.6), 0 0 26px rgba(29,181,132,0.28); }
        }
        .btn-ai-cta-refi {
          animation: teal-glow-refi 2.8s ease-in-out infinite;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .btn-ai-cta-refi:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 0 1px rgba(29,181,132,0.75), 0 0 32px rgba(29,181,132,0.38) !important;
          animation: none;
        }
        .refi-amort-pills { display: flex; flex-wrap: wrap; gap: 6px; }
        .refi-amort-pill  { flex: 1; min-width: calc(33.33% - 5px); text-align: center; }
        @media (min-width: 480px) { .refi-amort-pill { min-width: 0; } }
      `}</style>

      {/* ══ Block A: Input (7) + Results (5) ═══════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">

        {/* ── Input Card ─────────────────────────────────────────────────────── */}
        <div className="lg:col-span-7 lg:self-start" style={cardStyle}>
          <div className="p-5 md:p-6">

            {/* Card header */}
            <div className="flex items-center gap-3 mb-4 md:mb-5">
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: 'linear-gradient(135deg,#1DB584 0%,#0ea56e 100%)',
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(29,181,132,0.30)',
              }}>
                <RefreshCw size={15} color="white" strokeWidth={2.2} aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>
                  Mortgage Refinance
                </p>
                <p className="text-base font-bold" style={{ color: '#0D1B2A' }}>Refinance Details</p>
              </div>
            </div>

            {/* 2-col grid */}
            <div className="grid grid-cols-2 gap-x-2 md:gap-x-5">

              {/* Left — Current Mortgage */}
              <div className="space-y-2.5 min-w-0">
                <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9BA8B5' }}>Current Mortgage</p>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Balance <Tooltip text="Remaining principal on your current mortgage." />
                  </label>
                  <NumericInput value={form.currentBalance} onChange={v => set('currentBalance', v)} prefix={moneyPrefix} inputClassName={inputClsCompact} placeholder="450,000" />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Interest Rate <Tooltip text="Your current mortgage interest rate (annual %)." />
                  </label>
                  <NumericInput value={form.currentRate} onChange={v => set('currentRate', v)} suffix="%" inputClassName={inputClsCompact} placeholder="5.75" />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Years Remaining <Tooltip text="Years left on your current amortization." />
                  </label>
                  <NumericInput value={form.yearsRemaining} onChange={v => set('yearsRemaining', v)} suffix="yr" inputClassName={inputClsCompact} placeholder="20" />
                </div>

                {results && (
                  <div className="rounded-lg px-2.5 py-2" style={{ background: 'rgba(15,41,66,0.04)', border: '1px solid rgba(15,41,66,0.08)' }}>
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#9BA8B5' }}>Est. Current Payment</p>
                    <p className="text-sm font-bold" style={{ color: '#0D1B2A' }}>{fmtx(results.paymentCurr)}<span className="text-[10px] font-normal text-slate-400">/mo</span></p>
                    <p className="text-[9px] mt-0.5" style={{ color: '#9BA8B5' }}>P&amp;I only</p>
                  </div>
                )}
              </div>

              {/* Right — New Refinance */}
              <div className="border-l pl-2 md:pl-5 space-y-2.5 min-w-0" style={{ borderColor: 'rgba(15,41,66,0.08)' }}>
                <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9BA8B5' }}>New Refinance</p>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    New Rate <Tooltip text="The new annual interest rate you are considering." />
                  </label>
                  <NumericInput value={form.newRate} onChange={v => set('newRate', v)} suffix="%" inputClassName={inputClsCompact} placeholder="4.99" />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    New Amortization <Tooltip text="Length of the new mortgage. Extending beyond remaining years lowers the monthly payment but may increase total interest." />
                  </label>
                  <div className="refi-amort-pills">
                    {AMORT_OPTIONS.map(y => (
                      <button key={y} type="button" onClick={() => setNewAmort(y)}
                        className="refi-amort-pill font-semibold text-[11px] py-1 rounded-lg transition-colors duration-150"
                        style={newAmortization === y
                          ? { background: '#1DB584', color: '#fff', border: '1.5px solid #1DB584' }
                          : { background: 'rgba(15,41,66,0.04)', color: '#4B5563', border: '1.5px solid rgba(15,41,66,0.10)' }}>
                        {y}yr
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Refinance Costs <Tooltip text="Total estimated cost: prepayment penalty, legal fees, appraisal, admin." />
                  </label>
                  <NumericInput value={form.refinanceCosts} onChange={v => set('refinanceCosts', v)} prefix={moneyPrefix} inputClassName={inputClsCompact} placeholder="3,000" />
                </div>

                <div>
                  <label className={navyLabelCls} style={navyLabelStyle}>
                    Cash-Out <Tooltip text="Optional. Additional funds drawn from home equity at refinancing." />
                  </label>
                  <NumericInput value={form.cashOut} onChange={v => set('cashOut', v)} prefix={moneyPrefix} inputClassName={inputClsCompact} placeholder="0" />
                  {results && parseFloat(form.cashOut) > 0 && (
                    <p className="mt-0.5 text-[9px]" style={{ color: '#9BA8B5' }}>New principal: {fmtx(results.newPrincipal)}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Horizon — full width */}
            <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(15,41,66,0.08)' }}>
              <label className={navyLabelCls} style={{ ...navyLabelStyle, marginBottom: 8 }}>
                Comparison Horizon <Tooltip text="How many years to compare total costs over." />
              </label>
              <div className="flex gap-1.5">
                {HORIZON_OPTIONS.map(h => (
                  <button key={h} type="button" onClick={() => setHorizon(h)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150"
                    style={horizonYears === h
                      ? { background: '#1DB584', color: '#fff', border: '1.5px solid #1DB584' }
                      : { background: 'rgba(15,41,66,0.04)', color: '#4B5563', border: '1.5px solid rgba(15,41,66,0.10)' }}>
                    {h} yr
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

        {/* ── Results Card ──────────────────────────────────────────────────── */}
        <div id="calc-results" className="lg:col-span-5" style={{ scrollMarginTop: '80px' }}>
          <div className="flex flex-col h-full p-5 md:p-6 rounded-[20px]"
            style={{
              background: 'linear-gradient(150deg, #0D2137 0%, #0A1628 55%, #0D1B2A 100%)',
              border: '1px solid rgba(29,181,132,0.22)',
              minHeight: 340,
              boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(29,181,132,0.08)',
            }}>

            {!results ? (
              <div className="flex flex-1 items-center justify-center py-12">
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px', textAlign: 'center', lineHeight: 1.7 }}>
                  Enter current mortgage details<br />to estimate refinance savings.
                </p>
              </div>
            ) : (
              <div className="flex flex-col flex-1 gap-4">

                {/* Decision badge */}
                {dc && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                    style={{ background: dc.darkBg, border: `1px solid ${dc.darkBorder}` }}>
                    {results.decision === 'saves'          && <TrendingDown size={15} style={{ color: dc.color }} aria-hidden />}
                    {results.decision === 'no-break-even'  && <Clock        size={15} style={{ color: dc.color }} aria-hidden />}
                    {results.decision === 'costs-more'     && <AlertTriangle size={15} style={{ color: dc.color }} aria-hidden />}
                    <p className="text-sm font-bold" style={{ color: dc.color }}>{dc.label}</p>
                  </div>
                )}

                {/* Hero stat */}
                <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
                    {results.monthlySavings >= 0 ? 'Estimated Monthly Savings' : 'Estimated Monthly Increase'}
                  </p>
                  <p style={{ color: results.monthlySavings > 0 ? '#1DB584' : '#EF4444', fontSize: '38px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, marginTop: 8 }}>
                    {fmtx(Math.abs(results.monthlySavings))}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: 6 }}>
                    {fmtx(results.paymentCurr)} → {fmtx(results.paymentNew)}/mo
                  </p>
                </div>

                {/* Stat rows */}
                <div className="divide-y px-1" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  {([
                    { label: 'New Monthly Payment',                       value: fmtx(results.paymentNew),                                                        color: '#1DB584' },
                    { label: 'Refinance Costs',                           value: fmt(results.refinanceCosts),                                                     color: 'rgba(255,255,255,0.85)' },
                    { label: 'Break-even',
                      value: results.breakEvenMonths === null ? 'No break-even'
                           : results.breakEvenMonths === 0   ? 'Immediate'
                           : `Month ${results.breakEvenMonths}`,
                      color: results.breakEvenMonths !== null ? '#1DB584' : '#EF4444' },
                    { label: `Interest Savings (${results.horizonYears}yr)`, value: fmt(Math.abs(results.totalInterestDiff)),     color: results.totalInterestDiff >= 0 ? '#1DB584' : '#F59E0B' },
                    { label: `Net Savings (${results.horizonYears}yr)`,      value: fmt(Math.abs(results.netSavingsOverHorizon)), color: results.netSavingsOverHorizon >= 0 ? '#1DB584' : '#F59E0B' },
                  ] as { label: string; value: string; color: string }[]).map(row => (
                    <div key={row.label} className="flex items-center justify-between py-1.5">
                      <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{row.label}</span>
                      <span className="text-[12px] font-semibold" style={{ color: row.color }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex-1" />

                {/* CTA */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
                  <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.52)', marginBottom: 8, fontStyle: 'italic' }}>
                    See what&apos;s driving the refinance decision.
                  </p>
                  <button
                    onClick={scrollToAI}
                    onMouseEnter={() => setAiCtaHovered(true)}
                    onMouseLeave={() => setAiCtaHovered(false)}
                    className="btn-ai-cta-refi w-full font-bold overflow-hidden"
                    style={{ position: 'relative', background: '#060F1A', color: '#ffffff', borderRadius: 8, height: 40, fontSize: '13px', border: '1px solid rgba(29,181,132,0.4)' }}
                  >
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', opacity: aiCtaHovered ? 0 : 1, transition: 'opacity 200ms ease', pointerEvents: 'none' }}>
                      Review Refinance Insights ↓
                    </span>
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', opacity: aiCtaHovered ? 1 : 0, transition: 'opacity 200ms ease', pointerEvents: 'none' }}>
                      <Sparkles size={13} style={{ marginRight: 6, color: '#1DB584' }} aria-hidden />
                      See AI Refinance Analysis ↓
                    </span>
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>{/* end Block A */}

      {/* ══ Block B: Visual Cards ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">

        {/* ── Left: Current vs New Payment bar chart ─────────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 flex flex-col h-full">
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>Payment comparison</p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Current vs. New Payment</h3>
            </div>

            {!results ? (
              <div className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}>
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>Enter details to see the comparison.</p>
              </div>
            ) : (() => {
              const CHART_H = 180, XLABEL_H = 28, YAXIS_W = 30;
              const payC = results.paymentCurr, payN = results.paymentNew;
              const yMax = Math.max(payC, payN) * 1.18 || 1;
              const currH = Math.max(2, Math.round((payC / yMax) * CHART_H));
              const newH  = Math.max(2, Math.round((payN / yMax) * CHART_H));
              const tallerH = Math.max(currH, newH);
              const diffAmt = payC - payN;

              function fmtCompact(n: number) {
                if (Math.abs(n) >= 1000) return moneyPrefix + Math.round(n / 1000) + 'k';
                return moneyPrefix + Math.round(n);
              }

              return (
                <div className="flex-1">
                  <div className="flex gap-4 mb-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: '#334155' }} />
                      <span style={{ fontSize: '10px', color: '#6B7A8D' }}>Current</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: '#1DB584' }} />
                      <span style={{ fontSize: '10px', color: '#6B7A8D' }}>New</span>
                    </div>
                  </div>
                  <div style={{ position: 'relative', minHeight: CHART_H + XLABEL_H + 68 }}>
                    {/* Y-axis ticks */}
                    {[0, 0.5, 1].map(f => (
                      <div key={f} className="absolute" style={{ left: 0, width: YAXIS_W, bottom: XLABEL_H + Math.round(f * CHART_H) - 5, fontSize: '8px', color: '#9BA8B5', textAlign: 'right', lineHeight: 1 }}>
                        {fmtCompact(yMax * f)}
                      </div>
                    ))}
                    <div className="absolute top-0 bottom-0" style={{ left: YAXIS_W + 4, right: 0 }}>
                      {/* Grid lines */}
                      {[0, 0.5, 1].map(f => (
                        <div key={f} className="absolute left-0 right-0"
                          style={{ bottom: XLABEL_H + Math.round(f * CHART_H), borderTop: f === 0 ? '1px solid rgba(15,41,66,0.12)' : '1px dashed rgba(15,41,66,0.08)' }} />
                      ))}
                      {/* Bars */}
                      <div className="absolute left-0 right-0 flex items-end justify-center gap-10" style={{ bottom: XLABEL_H, height: CHART_H }}>
                        {/* Current bar */}
                        <div className="flex flex-col items-center" style={{ width: 70 }}>
                          <div style={{ position: 'relative', width: '100%', height: currH, background: '#334155', borderRadius: '4px 4px 0 0' }}>
                            {currH >= newH && (
                              <div style={{ position: 'absolute', bottom: tallerH + 14, left: '50%', transform: 'translateX(-50%)', zIndex: 10, whiteSpace: 'nowrap' }}>
                                <div className="relative rounded-xl px-2.5 py-2 text-center" style={{ background: '#fff', boxShadow: '0 3px 14px rgba(0,0,0,0.12)', border: `1.5px solid ${diffAmt >= 0 ? 'rgba(29,181,132,0.30)' : 'rgba(239,68,68,0.30)'}`, minWidth: 76 }}>
                                  <p style={{ fontSize: '9px', fontWeight: 700, color: '#6B7A8D', marginBottom: 2 }}>{diffAmt >= 0 ? 'Saves' : 'Costs more'}</p>
                                  <p style={{ fontSize: '13px', fontWeight: 800, color: diffAmt >= 0 ? '#1DB584' : '#EF4444', lineHeight: 1 }}>
                                    {fmtx(Math.abs(diffAmt))}<span style={{ fontSize: '10px', fontWeight: 600 }}>/mo</span>
                                  </p>
                                  <div style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `5px solid ${diffAmt >= 0 ? 'rgba(29,181,132,0.28)' : 'rgba(239,68,68,0.28)'}` }} />
                                  <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid #fff' }} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* New bar */}
                        <div className="flex flex-col items-center" style={{ width: 70 }}>
                          <div style={{ position: 'relative', width: '100%', height: newH, background: '#1DB584', borderRadius: '4px 4px 0 0' }}>
                            {newH > currH && (
                              <div style={{ position: 'absolute', bottom: tallerH + 14, left: '50%', transform: 'translateX(-50%)', zIndex: 10, whiteSpace: 'nowrap' }}>
                                <div className="relative rounded-xl px-2.5 py-2 text-center" style={{ background: '#fff', boxShadow: '0 3px 14px rgba(0,0,0,0.12)', border: '1.5px solid rgba(239,68,68,0.30)', minWidth: 76 }}>
                                  <p style={{ fontSize: '9px', fontWeight: 700, color: '#6B7A8D', marginBottom: 2 }}>Costs more</p>
                                  <p style={{ fontSize: '13px', fontWeight: 800, color: '#EF4444', lineHeight: 1 }}>
                                    {fmtx(Math.abs(diffAmt))}<span style={{ fontSize: '10px', fontWeight: 600 }}>/mo</span>
                                  </p>
                                  <div style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid rgba(239,68,68,0.28)' }} />
                                  <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid #fff' }} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* X labels */}
                      <div className="absolute left-0 right-0 bottom-0 flex items-center justify-center gap-10" style={{ height: XLABEL_H }}>
                        <div style={{ width: 70, textAlign: 'center', fontSize: '9px', color: '#9BA8B5', fontWeight: 600 }}>Current</div>
                        <div style={{ width: 70, textAlign: 'center' }}>
                          <span className="rounded-full" style={{ background: '#1DB584', color: '#fff', fontSize: '9px', fontWeight: 700, display: 'inline-block', padding: '4px 10px' }}>New</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] mt-3" style={{ color: '#9BA8B5' }}>
                    Estimated P&amp;I payments only. Actual payments may include taxes and insurance.
                  </p>
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── Right: Break-even Timeline SVG line chart ──────────────────── */}
        <div style={cardStyle}>
          <div className="p-5 md:p-6 flex flex-col h-full">
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-0.5" style={{ color: '#1DB584' }}>Timeline</p>
              <h3 className="text-base font-bold" style={{ color: '#0D1B2A' }}>Break-even Timeline</h3>
            </div>

            {!results ? (
              <div className="flex flex-1 items-center justify-center py-10 rounded-xl"
                style={{ background: 'rgba(15,41,66,0.03)', border: '1px dashed rgba(15,41,66,0.10)' }}>
                <p className="text-sm text-center" style={{ color: 'rgba(13,27,42,0.3)' }}>Enter details to see the timeline.</p>
              </div>
            ) : (() => {
              const horizonMonths = results.horizonYears * 12;
              const ms  = results.monthlySavings;
              const rc  = results.refinanceCosts;
              const beM = results.breakEvenMonths;
              const beInView = beM !== null && beM <= horizonMonths;

              const CW = 500, CH = 160, PAD_T = 22, PAD_L = 36, PAD_R = 8, PAD_B = 28;
              const plotW = CW - PAD_L - PAD_R;
              const plotH = CH - PAD_T - PAD_B;

              const maxSavings = ms * horizonMonths;
              const yMax = Math.max(rc * 1.15, maxSavings > 0 ? maxSavings * 1.12 : rc + 1, 1);

              const xOf = (m: number) => PAD_L + (m / horizonMonths) * plotW;
              const yOf = (v: number) => PAD_T + plotH * (1 - Math.min(1, Math.max(0, v) / yMax));

              function fmtK(n: number): string {
                if (Math.abs(n) >= 1_000_000) return moneyPrefix + (n / 1_000_000).toFixed(1) + 'M';
                if (Math.abs(n) >= 1000) return moneyPrefix + Math.round(n / 1000) + 'k';
                return moneyPrefix + Math.round(n);
              }

              const savY1 = yOf(Math.max(0, maxSavings));
              const costY = yOf(rc);
              const beCX = beM !== null ? xOf(beM) : null;
              const beCY = beM !== null ? yOf(ms * beM) : null;

              return (
                <div className="flex-1 flex flex-col">
                  <div className="flex gap-4 mb-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-0.5 rounded-full" style={{ background: ms >= 0 ? '#1DB584' : '#EF4444' }} />
                      <span style={{ fontSize: '10px', color: '#6B7A8D' }}>Cumulative savings</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-0.5 rounded-full" style={{ background: '#F59E0B' }} />
                      <span style={{ fontSize: '10px', color: '#6B7A8D' }}>Refinance cost</span>
                    </div>
                  </div>

                  <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" style={{ display: 'block', overflow: 'visible' }} aria-hidden>
                    {[0, 0.5, 1].map(f => (
                      <text key={f} x={PAD_L - 4} y={(yOf(yMax * f) + 4).toFixed(1)} textAnchor="end" fill="#9BA8B5" fontSize="8">
                        {fmtK(yMax * f)}
                      </text>
                    ))}
                    {[0, 0.5, 1].map(f => (
                      <line key={f} x1={PAD_L} y1={yOf(yMax * f).toFixed(1)} x2={(CW - PAD_R).toFixed(1)} y2={yOf(yMax * f).toFixed(1)}
                        stroke={f === 0 ? 'rgba(15,41,66,0.15)' : 'rgba(15,41,66,0.07)'}
                        strokeDasharray={f === 0 ? undefined : '4 3'} strokeWidth="1" />
                    ))}
                    {rc > 0 && (
                      <line x1={PAD_L} y1={costY.toFixed(1)} x2={(CW - PAD_R).toFixed(1)} y2={costY.toFixed(1)}
                        stroke="#F59E0B" strokeWidth="2" strokeDasharray="6 3" />
                    )}
                    <line x1={PAD_L.toFixed(1)} y1={yOf(0).toFixed(1)} x2={(CW - PAD_R).toFixed(1)} y2={savY1.toFixed(1)}
                      stroke={ms >= 0 ? '#1DB584' : '#EF4444'} strokeWidth="2.5" strokeLinecap="round" />
                    {beInView && beCX !== null && beCY !== null && (
                      <>
                        <line x1={beCX.toFixed(1)} y1={PAD_T.toFixed(1)} x2={beCX.toFixed(1)} y2={(PAD_T + plotH).toFixed(1)}
                          stroke="#1DB584" strokeWidth="1.5" strokeDasharray="4 3" />
                        <rect x={(beCX - 26).toFixed(1)} y={(PAD_T - 16).toFixed(1)} width="52" height="15" rx="4" fill="#1DB584" />
                        <text x={beCX.toFixed(1)} y={(PAD_T - 4).toFixed(1)} textAnchor="middle" fill="white" fontSize="9" fontWeight="700">
                          Mo {beM}
                        </text>
                        <circle cx={beCX.toFixed(1)} cy={beCY.toFixed(1)} r="5" fill="#1DB584" stroke="#fff" strokeWidth="2" />
                      </>
                    )}
                    <text x={PAD_L.toFixed(1)} y={(CH - 2).toFixed(1)} textAnchor="start" fill="#9BA8B5" fontSize="9">Mo 0</text>
                    <text x={(CW - PAD_R).toFixed(1)} y={(CH - 2).toFixed(1)} textAnchor="end" fill="#9BA8B5" fontSize="9">Mo {horizonMonths}</text>
                  </svg>

                  <div className="mt-3">
                    {beInView ? (
                      <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(29,181,132,0.08)', border: '1px solid rgba(29,181,132,0.20)' }}>
                        <p className="text-xs font-semibold" style={{ color: '#1DB584' }}>
                          Break-even at Month {beM} — cumulative savings recover the {fmt(rc)} refinance cost at this point.
                        </p>
                      </div>
                    ) : results.breakEvenMonths !== null && results.breakEvenMonths > horizonMonths ? (
                      <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)' }}>
                        <p className="text-xs font-semibold" style={{ color: '#C9A84C' }}>
                          Break-even at Month {results.breakEvenMonths} — beyond the {horizonMonths}-month window. Staying longer would improve the outcome.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
                        <p className="text-xs font-semibold" style={{ color: '#EF4444' }}>
                          {rc === 0 ? 'No refinance costs — savings begin immediately.' : 'New monthly payment is higher — no break-even under these assumptions.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

      </div>{/* end Block B */}

      {/* ══ Block C: AI Refinance Analysis — always visible ════════════════════ */}
      <div id="ai-analysis" className="overflow-hidden" style={{ ...cardStyle, padding: 0, scrollMarginTop: '80px' }}>

        {/* Dark header */}
        <div className="px-4 md:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #0f2744 100%)' }}>
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center shrink-0"
              style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(29,181,132,0.18)' }}>
              <Sparkles className="w-4 h-4" style={{ color: '#1DB584' }} aria-hidden />
            </span>
            <p className="text-white text-lg md:text-xl font-bold tracking-tight">
              FinCalc <span style={{ color: '#1DB584' }}>Smart</span> AI Refinance Analysis
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
              }}>
              <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {pdfLoading ? 'Generating…' : 'Download PDF'}
            </button>
            <button disabled aria-disabled title="Coming soon"
              className="inline-flex items-center gap-1.5 cursor-not-allowed select-none"
              style={{ border: '1.5px solid rgba(255,255,255,0.30)', color: 'rgba(255,255,255,0.78)', background: 'rgba(255,255,255,0.06)', borderRadius: 9999, padding: '7px 16px', fontSize: '13px', fontWeight: 700 }}>
              <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden />
              Email Results
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 md:p-5" style={{ background: '#f4f6f9' }}>

          {/* Empty state */}
          {!results && (
            <div className="flex flex-col items-center justify-center py-10 rounded-2xl gap-3"
              style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.08)' }}>
              <Sparkles className="w-5 h-5" style={{ color: '#1DB584' }} aria-hidden />
              <p className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>Enter your mortgage details above to get AI refinance insights.</p>
              <p className="text-xs text-center px-4" style={{ color: '#94a3b8', maxWidth: 340 }}>
                The analysis will show your monthly savings, break-even timeline, and total interest impact.
              </p>
            </div>
          )}

          {/* Active state */}
          {results && dc && (
            <>
              {/* ── Row 1: Result card + Smart Lever ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                {/* Left — Refinance Result */}
                <div className="rounded-2xl p-4 md:p-5 flex flex-col gap-3"
                  style={{ background: '#ffffff', border: `1px solid ${dc.border}`, borderLeft: `4px solid ${dc.color}`, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>

                  <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: dc.color }}>Refinance Result</p>

                  <div className="flex items-center gap-3">
                    <div style={{ width: 76, height: 76, borderRadius: 20, background: dc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: dc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${dc.color}55` }}>
                        {results.decision === 'saves'          && <TrendingDown size={24} color="#fff" strokeWidth={2.2} />}
                        {results.decision === 'no-break-even'  && <Clock        size={24} color="#fff" strokeWidth={2.2} />}
                        {results.decision === 'costs-more'     && <AlertTriangle size={24} color="#fff" strokeWidth={2.2} />}
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize: 19, fontWeight: 800, color: dc.color, lineHeight: 1.1, letterSpacing: '-0.5px' }}>
                        {results.decision === 'saves'          ? 'Refinancing Saves'
                         : results.decision === 'no-break-even' ? 'Close Call'
                         : 'Payment Increases'}
                      </p>
                      <p className="text-xs font-semibold mt-0.5" style={{ color: '#6B7A8D' }}>{dc.label}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold" style={{ background: dc.bg, color: dc.color }}>
                      {fmtx(Math.abs(results.monthlySavings))}/mo {results.monthlySavings >= 0 ? 'savings' : 'increase'}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#F1F4F7', color: '#6B7A8D' }}>
                      {results.breakEvenMonths === null ? 'No break-even'
                       : results.breakEvenMonths === 0  ? 'Immediate break-even'
                       : `Break-even Mo ${results.breakEvenMonths}`}
                    </span>
                  </div>

                  <div style={{ borderTop: '1px solid #F1F4F7', paddingTop: 10 }}>
                    <p className="text-xs leading-relaxed" style={{ color: '#6B7A8D' }}>
                      {results.decision === 'saves' &&
                        `Monthly payment drops by ${fmtx(results.monthlySavings)} — refinance costs of ${fmt(results.refinanceCosts)} are recovered at Month ${results.breakEvenMonths}. Over ${results.horizonYears} years, estimated net savings are ${fmt(Math.abs(results.netSavingsOverHorizon))}.`}
                      {results.decision === 'no-break-even' &&
                        `Monthly payment drops by ${fmtx(results.monthlySavings)}, but the ${fmt(results.refinanceCosts)} refinance cost requires ${results.breakEvenMonths} months to recover — beyond the ${results.horizonYears}-year window. Staying longer improves the outcome.`}
                      {results.decision === 'costs-more' &&
                        `The new payment of ${fmtx(results.paymentNew)} is higher than the current payment of ${fmtx(results.paymentCurr)}. This can occur when cash-out increases the principal or when rate savings are insufficient.`}
                    </p>
                  </div>
                </div>

                {/* Right — Smart Lever */}
                {(() => {
                  const extYears = results.newAmortization - Math.ceil(results.yearsRemaining);
                  const isTermExt = results.termExtended;

                  let leverTitle: string;
                  let leverBigNum: string;
                  let leverBigLabel: string;
                  let leverDetail: string;

                  if (isTermExt) {
                    leverTitle    = 'Term Extension Warning';
                    leverBigNum   = `+${extYears} yr${extYears !== 1 ? 's' : ''}`;
                    leverBigLabel = 'added to your amortization';
                    leverDetail   = `Refinancing from ${Math.ceil(results.yearsRemaining)} remaining years to a ${results.newAmortization}-year amortization extends your mortgage by ${extYears} year${extYears !== 1 ? 's' : ''}. Over the ${results.horizonYears}-year window, ${results.totalInterestDiff >= 0 ? `interest savings are estimated at ${fmt(results.totalInterestDiff)}` : `interest cost is estimated ${fmt(Math.abs(results.totalInterestDiff))} higher than continuing the current mortgage`}.`;
                  } else if (results.monthlySavings > 0) {
                    leverTitle    = 'Break-even Timeline';
                    leverBigNum   = results.breakEvenMonths === 0 ? 'Immediate' : results.breakEvenMonths !== null ? `Month ${results.breakEvenMonths}` : '—';
                    leverBigLabel = 'break-even point';
                    leverDetail   = results.breakEvenMonths === 0
                      ? `No refinance costs — every month's savings (${fmtx(results.monthlySavings)}/mo) is pure benefit from day one.`
                      : results.breakEvenMonths !== null
                        ? `You need to keep the new mortgage for ${results.breakEvenMonths} month${results.breakEvenMonths !== 1 ? 's' : ''} to recover the ${fmt(results.refinanceCosts)} refinance cost. After that, ${fmtx(results.monthlySavings)}/mo stays in your pocket.`
                        : 'Monthly savings do not recover the refinance cost within the comparison horizon.';
                  } else {
                    leverTitle    = 'Payment Increases';
                    leverBigNum   = `+${fmtx(Math.abs(results.monthlySavings))}/mo`;
                    leverBigLabel = 'estimated monthly increase';
                    leverDetail   = `The new payment of ${fmtx(results.paymentNew)} is ${fmtx(Math.abs(results.monthlySavings))} more than the current ${fmtx(results.paymentCurr)}/mo. If cash-out is involved, the additional principal is driving the increase. Consider reducing the cash-out amount or choosing a longer amortization.`;
                  }

                  return (
                    <div className="rounded-2xl p-4 md:p-5 flex flex-col gap-3"
                      style={{ background: 'linear-gradient(145deg, #0D1B2A 0%, #0c1e3a 100%)', border: '1px solid rgba(29,181,132,0.14)', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
                        <span className="text-sm font-bold" style={{ color: '#1DB584' }}>
                          {isTermExt ? 'Key Tradeoff' : results.monthlySavings > 0 ? 'Key Insight' : 'Key Warning'}
                        </span>
                      </div>
                      <div className="rounded-xl px-4 py-4" style={{ background: 'rgba(29,181,132,0.10)', border: '1px solid rgba(29,181,132,0.22)' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(29,181,132,0.7)', marginBottom: 6 }}>
                          {leverTitle}
                        </p>
                        <p className="font-extrabold tabular-nums" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', color: '#1DB584', letterSpacing: '-1.5px', lineHeight: 1 }}>
                          {leverBigNum}
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', marginTop: 6 }}>{leverBigLabel}</p>
                      </div>
                      <div className="rounded-xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{leverDetail}</p>
                      </div>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', fontStyle: 'italic', lineHeight: 1.5 }}>
                        Estimate based on entered inputs. Actual results depend on lender terms and conditions.
                      </p>
                    </div>
                  );
                })()}

              </div>{/* end Row 1 */}

              {/* ── Row 2: Three insight cards ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">

                {/* Monthly Payment Change */}
                {(() => {
                  const saves = results.monthlySavings > 0;
                  const pct = results.paymentCurr > 0 ? Math.abs(results.monthlySavings / results.paymentCurr * 100) : 0;
                  const bg = saves ? '#ECFDF5' : '#FEF2F2';
                  const border = saves ? '#A7F3D0' : '#FECACA';
                  const color = saves ? '#059669' : '#DC2626';
                  const iconBg = saves ? '#D1FAE5' : '#FEE2E2';
                  return (
                    <div className="rounded-xl p-4" style={{ background: bg, border: `1px solid ${border}` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="flex items-center justify-center shrink-0" style={{ width: 28, height: 28, borderRadius: 8, background: iconBg }}>
                          {saves ? <TrendingDown className="w-3.5 h-3.5" style={{ color }} aria-hidden /> : <TrendingUp className="w-3.5 h-3.5" style={{ color }} aria-hidden />}
                        </span>
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color }}>Monthly Payment Change</p>
                      </div>
                      <p className="text-sm font-semibold mb-1" style={{ color: '#0D1B2A' }}>
                        {saves ? `${fmtx(results.monthlySavings)}/mo less — ${pct.toFixed(1)}% lower` : `${fmtx(Math.abs(results.monthlySavings))}/mo more — ${pct.toFixed(1)}% higher`}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>
                        {fmtx(results.paymentCurr)}/mo current → {fmtx(results.paymentNew)}/mo new. Estimated P&amp;I only.
                      </p>
                    </div>
                  );
                })()}

                {/* Break-even Check */}
                <div className="rounded-xl p-4" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center shrink-0" style={{ width: 28, height: 28, borderRadius: 8, background: '#e0f2fe' }}>
                      <Clock className="w-3.5 h-3.5 text-sky-600" aria-hidden />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-widest text-sky-600">Break-even Check</p>
                  </div>
                  {results.breakEvenMonths === null ? (
                    <>
                      <p className="text-sm font-semibold mb-1" style={{ color: '#0D1B2A' }}>No break-even reached</p>
                      <p className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>Since the new payment is higher, refinance costs cannot be recovered through monthly savings.</p>
                    </>
                  ) : results.breakEvenMonths === 0 ? (
                    <>
                      <p className="text-sm font-semibold mb-1" style={{ color: '#0D1B2A' }}>Immediate — no refinance costs</p>
                      <p className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>Monthly savings of {fmtx(results.monthlySavings)} begin from month one.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold mb-1" style={{ color: '#0D1B2A' }}>Break-even at Month {results.breakEvenMonths}</p>
                      <p className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>
                        {results.breakEvenMonths <= results.horizonYears * 12
                          ? `Costs are recovered within the ${results.horizonYears}-year window. Staying beyond Month ${results.breakEvenMonths} builds savings.`
                          : `Beyond the ${results.horizonYears * 12}-month window. Moving sooner means costs may not be recovered.`}
                      </p>
                    </>
                  )}
                </div>

                {/* Total Interest Impact */}
                {(() => {
                  const saves = results.totalInterestDiff > 0;
                  const bg = saves ? '#ECFDF5' : '#FFFBEB';
                  const border = saves ? '#A7F3D0' : '#FDE68A';
                  const color = saves ? '#059669' : '#D97706';
                  const iconBg = saves ? '#D1FAE5' : '#FEF3C7';
                  return (
                    <div className="rounded-xl p-4" style={{ background: bg, border: `1px solid ${border}` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="flex items-center justify-center shrink-0" style={{ width: 28, height: 28, borderRadius: 8, background: iconBg }}>
                          <AlertTriangle className="w-3.5 h-3.5" style={{ color }} aria-hidden />
                        </span>
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color }}>Total Interest Impact</p>
                      </div>
                      <p className="text-sm font-semibold mb-1" style={{ color: '#0D1B2A' }}>
                        {saves ? `${fmt(results.totalInterestDiff)} less interest (${results.horizonYears}yr)` : `${fmt(Math.abs(results.totalInterestDiff))} more interest (${results.horizonYears}yr)`}
                      </p>
                      <p className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>
                        {saves
                          ? `Over ${results.horizonYears} years the lower rate reduces interest by ${fmt(results.totalInterestDiff)} vs. continuing the current mortgage.`
                          : `Over ${results.horizonYears} years the new loan accrues ${fmt(Math.abs(results.totalInterestDiff))} more interest${results.termExtended ? ' — partly due to the term extension' : ''}.`}
                      </p>
                    </div>
                  );
                })()}

              </div>{/* end Row 2 */}

              {/* Summary stat grid */}
              <style>{`
                .refi-stat-grid > div { border-right: 1px solid #F1F4F7; border-bottom: 1px solid #F1F4F7; }
                .refi-stat-grid > div:nth-child(even) { border-right: none; }
                .refi-stat-grid > div:nth-child(n+3) { border-bottom: none; }
                @media (min-width: 768px) {
                  .refi-stat-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
                  .refi-stat-grid > div { border-bottom: none; border-right: 1px solid #F1F4F7; }
                  .refi-stat-grid > div:last-child { border-right: none; }
                }
              `}</style>
              <div className="rounded-2xl overflow-hidden" style={{ background: '#ffffff', border: '1px solid rgba(15,41,66,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                <div style={{ background: '#F8FAFB', borderBottom: '1px solid rgba(15,41,66,0.09)', padding: '9px 16px' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#9BA8B5', letterSpacing: '0.12em' }}>
                    {results.horizonYears}-Year Summary
                  </p>
                </div>
                <div className="refi-stat-grid grid grid-cols-2">
                  {([
                    { label: 'Current Payment', value: fmtx(results.paymentCurr),                                                                                        color: '#334155' },
                    { label: 'New Payment',      value: fmtx(results.paymentNew),                                                                                        color: '#1DB584' },
                    { label: 'Monthly Savings',  value: (results.monthlySavings >= 0 ? '' : '−') + fmtx(Math.abs(results.monthlySavings)),                              color: results.monthlySavings >= 0 ? '#1DB584' : '#EF4444' },
                    { label: 'Break-even',       value: results.breakEvenMonths === null ? 'None' : results.breakEvenMonths === 0 ? 'Instant' : `Mo ${results.breakEvenMonths}`, color: results.breakEvenMonths !== null ? '#1DB584' : '#EF4444' },
                  ] as { label: string; value: string; color: string }[]).map(row => (
                    <div key={row.label} className="px-5 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: '#9BA8B5' }}>{row.label}</p>
                      <p style={{ fontSize: 17, fontWeight: 700, color: row.color, letterSpacing: '-0.5px' }}>{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>

            </>
          )}

        </div>{/* end body */}

        {/* Inner disclaimer */}
        <div className="flex items-start gap-2.5 px-5 md:px-6 py-4"
          style={{ borderTop: '1px solid rgba(15,41,66,0.07)', background: '#f8fafb' }}>
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden />
          <p className="text-slate-400 text-xs leading-relaxed">
            <strong className="text-slate-500 font-semibold">Estimates only.</strong> Results depend on actual lender terms, prepayment penalties, appraisal fees, and legal costs. CMHC/PMI may apply to refinanced amounts above 80% LTV and is not included. Does not constitute financial, mortgage, tax, or legal advice. Consult a licensed mortgage professional before refinancing.
          </p>
        </div>

      </div>{/* end Block C */}

      {/* ══ How It Works ════════════════════════════════════════════════════════ */}
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

      {/* ══ FAQ ═════════════════════════════════════════════════════════════════ */}
      {faqItems.length > 0 && (
        <div style={cardStyle} className="p-6 md:p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2.5">
            <HelpCircle className="w-5 h-5 shrink-0" style={{ color: '#1DB584' }} aria-hidden />
            Frequently Asked Questions
          </h2>
          <CalculatorFaqAccordion faqs={faqItems} />
        </div>
      )}

      {/* ══ Disclaimer ══════════════════════════════════════════════════════════ */}
      <p className="text-xs text-slate-400 text-center mt-4 pb-12 px-4 leading-relaxed max-w-4xl mx-auto">
        This calculator is for illustrative and informational purposes only. Results are estimates and may not reflect
        actual lender terms, prepayment penalties, appraisal or legal fees, CMHC/PMI premiums, or other charges.
        Cash-out refinancing may have different lender eligibility requirements. Does not constitute financial, mortgage,
        tax, or legal advice. Consult a licensed mortgage professional before making any refinancing decisions.
      </p>

    </div>
  );
}
