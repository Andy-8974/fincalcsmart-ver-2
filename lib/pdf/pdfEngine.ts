/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReportData, MetricItem, ResultRow, CompositionSegment, StatusType } from './pdfTypes';
import { C, P, F, lh } from './pdfTheme';

type Doc = any; // jsPDF instance — loaded dynamically

// ─── Primitive helpers ────────────────────────────────────────────────────────

function setFont(doc: Doc, style: 'normal' | 'bold' | 'italic', size?: number) {
  doc.setFont(F, style);
  if (size !== undefined) doc.setFontSize(size);
}

function setColor(doc: Doc, color: [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function fillRect(
  doc: Doc,
  color: [number, number, number],
  x: number, y: number, w: number, h: number,
  r = 0,
) {
  doc.setFillColor(color[0], color[1], color[2]);
  if (r > 0) doc.roundedRect(x, y, w, h, r, r, 'F');
  else doc.rect(x, y, w, h, 'F');
}

function strokeLine(
  doc: Doc,
  color: [number, number, number],
  x1: number, y1: number, x2: number, y2: number,
  lw = 0.25,
) {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(lw);
  doc.line(x1, y1, x2, y2);
}

function accentColor(accent?: string): [number, number, number] {
  if (accent === 'teal')  return C.teal;
  if (accent === 'amber') return C.amber;
  if (accent === 'red')   return C.red;
  if (accent === 'slate') return C.slate;
  return C.textPri;
}

function statusBadgeColor(type: StatusType): [number, number, number] {
  if (type === 'success') return C.teal;
  if (type === 'warning') return C.amber;
  if (type === 'danger')  return C.red;
  return C.slate;
}

// ─── Safe page-break helper ───────────────────────────────────────────────────
// Adds a new page and draws the mini-header if `y + needed` would enter the
// footer-safe zone. Returns the updated y position.

function ensureSpace(doc: Doc, data: ReportData, y: number, needed: number): number {
  if (y + needed > P.safeY) {
    doc.addPage();
    return drawPage2Header(doc, data);
  }
  return y;
}

// ─── Height pre-calculators (no drawing) ─────────────────────────────────────

function calcInsightBlockHeight(doc: Doc, paragraphs: string[]): number {
  const allLines: string[] = [];
  paragraphs.forEach((p, i) => {
    if (i > 0) allLines.push('');
    const wrapped = doc.splitTextToSize(p, P.IW - 10) as string[];
    allLines.push(...wrapped);
  });
  // section heading (~8.5mm) + box + trailing gap
  const boxH = Math.max(22, 6 + allLines.length * lh(8) + 6);
  return 8.5 + boxH + 5;
}

function calcInputsTableHeight(data: ReportData): number {
  // section heading + rows
  return 8.5 + data.inputs.rows.length * 6.5 + 4;
}

function calcResultsSectionHeight(data: ReportData): number {
  return 8.5 + data.results.rows.length * 6.5 + 4;
}

function calcKeyDriversHeight(doc: Doc, drivers: string[]): number {
  let h = 8.5; // section heading
  drivers.forEach(d => {
    const lines = doc.splitTextToSize(d, P.IW - 8) as string[];
    h += lines.length * lh(7.5) + 2;
  });
  return h + 2;
}

function calcMethodologyHeight(doc: Doc, data: ReportData): number {
  let h = 8.5; // section heading
  h += 4.5;    // "What this calculator models:" sub-heading
  data.methodology.whatItDoes.forEach(item => {
    const lines = doc.splitTextToSize(item, P.IW - 7) as string[];
    h += lines.length * lh(7) + 1.2;
  });
  h += 3 + 4.5; // gap + "What this calculator does not model:"
  data.methodology.notModeled.forEach(item => {
    const lines = doc.splitTextToSize(`• ${item}`, P.IW - 5) as string[];
    h += lines.length * lh(7) + 1;
  });
  return h + 3;
}

function calcDisclaimerHeight(doc: Doc, text: string): number {
  const lines = doc.splitTextToSize(text, P.IW - 12) as string[];
  const boxH = 6 + lines.length * lh(7) + 5;
  return 8.5 + boxH + 4; // section heading + box + trailing
}

// ─── Section heading ──────────────────────────────────────────────────────────

function drawSectionHeading(doc: Doc, label: string, y: number): number {
  setFont(doc, 'bold', 7.5);
  setColor(doc, C.textSec);
  doc.text(label.toUpperCase(), P.MH, y);
  y += 2.5;
  strokeLine(doc, C.border, P.MH, y, P.W - P.MH, y);
  return y + 4;
}

// ─── Page 1: Brand bar ───────────────────────────────────────────────────────

function drawBrandBar(doc: Doc, data: ReportData): number {
  fillRect(doc, C.navy, 0, 0, P.W, 20);

  setFont(doc, 'bold', 14);
  setColor(doc, C.white);
  doc.text('FinCalc', P.MH, 13);
  const w1 = doc.getTextWidth('FinCalc');
  setColor(doc, C.teal);
  doc.text(' Smart', P.MH + w1, 13);

  setFont(doc, 'normal', 6.5);
  setColor(doc, C.textMut);
  doc.text(data.header.generatedAt, P.W - P.MH, 9, { align: 'right' });
  doc.text(`Scenario: ${data.header.scenarioId}`, P.W - P.MH, 15.5, { align: 'right' });

  return 20;
}

// ─── Page 1: Calculator title block ──────────────────────────────────────────

function drawPageTitle(doc: Doc, data: ReportData, y: number): number {
  y += 7;

  setFont(doc, 'bold', 13);
  setColor(doc, C.textPri);
  doc.text(data.header.calculatorName, P.MH, y);

  setFont(doc, 'normal', 8);
  setColor(doc, C.textSec);
  doc.text(data.header.reportSubtitle, P.MH, y + 5.5);

  setFont(doc, 'bold', 8);
  setColor(doc, C.teal);
  doc.text(`${data.header.region}  ·  ${data.header.currency}`, P.W - P.MH, y, { align: 'right' });

  setFont(doc, 'normal', 6.5);
  setColor(doc, C.textMut);
  doc.text(data.header.sourceUrl, P.W - P.MH, y + 5.5, { align: 'right' });

  y += 12;
  strokeLine(doc, C.border, P.MH, y, P.W - P.MH, y, 0.3);
  return y + 5;
}

// ─── Page 1: Executive summary navy panel ────────────────────────────────────

function drawExecutiveSummary(doc: Doc, data: ReportData, y: number): number {
  const { metrics, statusLabel, statusType } = data.executiveSummary;
  const PH = 46;

  fillRect(doc, C.navy, P.MH, y, P.IW, PH, 3);
  fillRect(doc, C.teal, P.MH, y, 3, PH, 1.5);
  fillRect(doc, C.teal, P.MH + 1.5, y, 1.5, PH);

  setFont(doc, 'bold', 7);
  setColor(doc, C.teal);
  doc.text('EXECUTIVE SUMMARY', P.MH + 8, y + 7);

  const badgeColor = statusBadgeColor(statusType);
  setFont(doc, 'bold', 7.5);
  const bw = doc.getTextWidth(statusLabel) + 9;
  fillRect(doc, badgeColor, P.MH + P.IW - bw - 5, y + 3.5, bw, 7.5, 2);
  setColor(doc, C.white);
  doc.text(statusLabel, P.MH + P.IW - bw / 2 - 5, y + 8.8, { align: 'center' });

  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.1);
  doc.line(P.MH + 8, y + 12, P.MH + P.IW - 6, y + 12);

  const n = metrics.length;
  const colW = P.IW / n;
  const valueBaseY = y + 24;

  metrics.forEach((m: MetricItem, i: number) => {
    const cx = P.MH + i * colW + colW / 2;

    const vSize = m.value.length > 11 ? 11 : 14;
    setFont(doc, 'bold', vSize);
    const mc = m.accent ? accentColor(m.accent) : C.white;
    setColor(doc, mc);
    doc.text(m.value, cx, valueBaseY, { align: 'center' });

    setFont(doc, 'normal', 6.5);
    setColor(doc, C.textMut);
    doc.text(m.label, cx, valueBaseY + 5.5, { align: 'center' });

    if (m.sub) {
      setFont(doc, 'bold', 6.5);
      setColor(doc, mc);
      doc.text(m.sub, cx, valueBaseY + 10, { align: 'center' });
    }

    if (i < n - 1) {
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.15);
      doc.setLineDashPattern([1.5, 1.5], 0);
      const divX = P.MH + (i + 1) * colW;
      doc.line(divX, y + 12, divX, y + PH - 5);
      doc.setLineDashPattern([], 0);
    }
  });

  return y + PH + 5;
}

// ─── Page 1: Composition bar (directly rendered vector) ──────────────────────

function drawCompositionBar(doc: Doc, data: ReportData, y: number): number {
  const { segments, title, totalFormatted } = data.compositionBar;
  y = drawSectionHeading(doc, title, y);

  const barX = P.MH;
  const barW = P.IW;
  const barH = 11;

  fillRect(doc, C.border, barX, y, barW, barH, 2);

  const segColorMap: Record<string, [number, number, number]> = {
    teal:  C.teal,
    slate: C.slate,
    amber: C.amber,
  };

  let sx = barX;
  segments.forEach((seg: CompositionSegment, i: number) => {
    const sw = barW * seg.pct;
    const color = segColorMap[seg.color] ?? C.slate;
    doc.setFillColor(color[0], color[1], color[2]);

    if (segments.length === 1) {
      doc.roundedRect(sx, y, sw, barH, 2, 2, 'F');
    } else if (i === 0) {
      doc.roundedRect(sx, y, sw, barH, 2, 2, 'F');
      doc.rect(sx + sw - 3, y, 3, barH, 'F');
    } else if (i === segments.length - 1) {
      doc.roundedRect(sx, y, sw, barH, 2, 2, 'F');
      doc.rect(sx, y, 3, barH, 'F');
    } else {
      doc.rect(sx, y, sw, barH, 'F');
    }

    if (sw > 28) {
      setFont(doc, 'bold', 8);
      setColor(doc, C.white);
      doc.text(`${(seg.pct * 100).toFixed(0)}%`, sx + sw / 2, y + 7.2, { align: 'center' });
    }

    sx += sw;
  });

  y += barH + 4;

  setFont(doc, 'normal', 7);
  setColor(doc, C.textMut);
  doc.text(`Total projected: ${totalFormatted}`, P.MH, y);
  y += 5;

  let legendX = P.MH;
  segments.forEach((seg: CompositionSegment) => {
    const color = segColorMap[seg.color] ?? C.slate;
    fillRect(doc, color, legendX, y - 2.8, 3.5, 3.5);
    setFont(doc, 'normal', 7);
    setColor(doc, C.textSec);
    const label = `${seg.label}: ${seg.valueFormatted} (${(seg.pct * 100).toFixed(1)}%)`;
    doc.text(label, legendX + 5, y);
    legendX += doc.getTextWidth(label) + 12;
  });

  return y + 6;
}

// ─── AI insight block ─────────────────────────────────────────────────────────

function drawInsightBlock(doc: Doc, data: ReportData, y: number): number {
  const { title, paragraphs } = data.insightBlock;
  y = drawSectionHeading(doc, title, y);

  const allLines: string[] = [];
  paragraphs.forEach((p, i) => {
    if (i > 0) allLines.push('');
    const wrapped = doc.splitTextToSize(p, P.IW - 10) as string[];
    allLines.push(...wrapped);
  });
  const blockH = Math.max(22, 6 + allLines.length * lh(8) + 6);

  fillRect(doc, C.softGray, P.MH, y, P.IW, blockH, 2);
  fillRect(doc, C.teal, P.MH, y, 2.5, blockH, 1);
  fillRect(doc, C.teal, P.MH + 1.2, y, 1.3, blockH);

  let ty = y + 6 + lh(8) * 0.5;
  paragraphs.forEach((p, i) => {
    if (i > 0) ty += lh(8) * 0.6;
    const lines = doc.splitTextToSize(p, P.IW - 12) as string[];
    setFont(doc, 'normal', 8);
    setColor(doc, C.textSec);
    doc.text(lines, P.MH + 6, ty);
    ty += lines.length * lh(8);
  });

  return y + blockH + 5;
}

// ─── Inputs & Assumptions table ───────────────────────────────────────────────

function drawInputsTable(doc: Doc, data: ReportData, y: number): number {
  y = drawSectionHeading(doc, data.inputs.title, y);

  const rowH = 6.5;
  const col2 = P.MH + P.IW * 0.56;

  data.inputs.rows.forEach((row, i) => {
    if (i % 2 === 0) fillRect(doc, C.softGray, P.MH, y - 4.5, P.IW, rowH);
    setFont(doc, 'normal', 7.5);
    setColor(doc, C.textSec);
    doc.text(row.label, P.MH + 2, y);
    setFont(doc, 'bold', 7.5);
    setColor(doc, C.textPri);
    doc.text(row.value, col2, y);
    y += rowH;
  });

  return y + 4;
}

// ─── Shared: Page footer (drawn via setPage pass at the end) ──────────────────

function drawFooter(doc: Doc, pageNum: number, totalPages: number, data: ReportData) {
  strokeLine(doc, C.border, P.MH, P.footerY - 3, P.W - P.MH, P.footerY - 3, 0.2);
  setFont(doc, 'normal', 6.5);
  setColor(doc, C.textMut);
  doc.text(data.header.sourceUrl, P.MH, P.footerY + 1);
  doc.text('For educational purposes only. Not financial advice.', P.W / 2, P.footerY + 1, { align: 'center' });
  doc.text(`Page ${pageNum} of ${totalPages}`, P.W - P.MH, P.footerY + 1, { align: 'right' });
}

// ─── Page 2+: Mini header ─────────────────────────────────────────────────────

function drawPage2Header(doc: Doc, data: ReportData): number {
  fillRect(doc, C.navy, 0, 0, P.W, 12);

  setFont(doc, 'bold', 9);
  setColor(doc, C.white);
  doc.text('FinCalc', P.MH, 8.5);
  const w1 = doc.getTextWidth('FinCalc');
  setColor(doc, C.teal);
  doc.text(' Smart', P.MH + w1, 8.5);

  setFont(doc, 'normal', 6.5);
  setColor(doc, C.textMut);
  doc.text(
    `${data.header.calculatorName} — Scenario Details`,
    P.W - P.MH, 8.5, { align: 'right' },
  );

  return 19;
}

// ─── Detailed results ─────────────────────────────────────────────────────────

function drawResultsSection(doc: Doc, data: ReportData, y: number): number {
  y = drawSectionHeading(doc, data.results.title, y);

  const rowH = 6.5;

  data.results.rows.forEach((row: ResultRow, i: number) => {
    if (i % 2 === 0) fillRect(doc, C.softGray, P.MH, y - 4.5, P.IW, rowH);
    setFont(doc, 'normal', 7.5);
    setColor(doc, C.textSec);
    doc.text(row.label, P.MH + 2, y);
    setFont(doc, 'bold', 7.5);
    setColor(doc, row.accent ? accentColor(row.accent) : C.textPri);
    doc.text(row.value, P.W - P.MH, y, { align: 'right' });
    y += rowH;
  });

  return y + 4;
}

// ─── Key drivers ──────────────────────────────────────────────────────────────

function drawKeyDrivers(doc: Doc, drivers: string[], y: number): number {
  y = drawSectionHeading(doc, 'Key Drivers / Possible Adjustments', y);

  drivers.forEach((d) => {
    const lines = doc.splitTextToSize(d, P.IW - 8) as string[];
    fillRect(doc, C.teal, P.MH, y - 2, 2, 2);
    setFont(doc, 'normal', 7.5);
    setColor(doc, C.textSec);
    doc.text(lines, P.MH + 5, y);
    y += lines.length * lh(7.5) + 2;
  });

  return y + 2;
}

// ─── Methodology ──────────────────────────────────────────────────────────────

function drawMethodology(doc: Doc, data: ReportData, y: number): number {
  y = drawSectionHeading(doc, 'Methodology', y);

  setFont(doc, 'bold', 7.5);
  setColor(doc, C.textPri);
  doc.text('What this calculator models:', P.MH, y);
  y += 4.5;

  data.methodology.whatItDoes.forEach((item) => {
    fillRect(doc, C.teal, P.MH, y - 1.5, 2, 2);
    setFont(doc, 'normal', 7);
    setColor(doc, C.textSec);
    const lines = doc.splitTextToSize(item, P.IW - 7) as string[];
    doc.text(lines, P.MH + 5, y);
    y += lines.length * lh(7) + 1.2;
  });

  y += 3;
  setFont(doc, 'bold', 7.5);
  setColor(doc, C.textPri);
  doc.text('What this calculator does not model:', P.MH, y);
  y += 4.5;

  data.methodology.notModeled.forEach((item) => {
    setFont(doc, 'normal', 7);
    setColor(doc, C.textSec);
    const lines = doc.splitTextToSize(`• ${item}`, P.IW - 5) as string[];
    doc.text(lines, P.MH + 3, y);
    y += lines.length * lh(7) + 1;
  });

  return y + 3;
}

// ─── Educational disclaimer ───────────────────────────────────────────────────

function drawDisclaimer(doc: Doc, text: string, y: number): number {
  y = drawSectionHeading(doc, 'Educational Disclaimer', y);

  const lines = doc.splitTextToSize(text, P.IW - 12) as string[];
  const boxH = 6 + lines.length * lh(7) + 5;

  fillRect(doc, C.amberBg, P.MH, y, P.IW, boxH, 2);
  fillRect(doc, C.amber, P.MH, y, 2.5, boxH, 1);
  fillRect(doc, C.amber, P.MH + 1.2, y, 1.3, boxH);

  setFont(doc, 'normal', 7);
  setColor(doc, C.amberText);
  doc.text(lines, P.MH + 6, y + 6 + lh(7) * 0.3);

  return y + boxH + 4;
}

// ─── Core document builder (exported for Node.js sample generation) ───────────

export async function buildReportDocument(data: ReportData): Promise<Doc> {
  const jspdfModule = await import('jspdf');
  const JsPDFCtor = (jspdfModule as any).jsPDF ?? (jspdfModule as any).default;
  const doc: Doc = new JsPDFCtor({ orientation: 'portrait', unit: 'mm', format: 'letter' });

  // ── Page 1: Header → Exec Summary → Composition → AI Summary → Inputs ────
  let y = drawBrandBar(doc, data);
  y = drawPageTitle(doc, data, y);

  y = ensureSpace(doc, data, y, 51); // 46mm panel + 5 gap
  y = drawExecutiveSummary(doc, data, y);

  y = ensureSpace(doc, data, y, 35);
  y = drawCompositionBar(doc, data, y);

  const insightH = calcInsightBlockHeight(doc, data.insightBlock.paragraphs);
  y = ensureSpace(doc, data, y, insightH);
  y = drawInsightBlock(doc, data, y);

  const inputsH = calcInputsTableHeight(data);
  y = ensureSpace(doc, data, y, inputsH);
  y = drawInputsTable(doc, data, y);

  // ── Page 2: Results → Key Drivers → Methodology → Disclaimer ─────────────
  doc.addPage();
  y = drawPage2Header(doc, data);

  const resultsH = calcResultsSectionHeight(data);
  y = ensureSpace(doc, data, y, resultsH);
  y = drawResultsSection(doc, data, y);

  const driversH = calcKeyDriversHeight(doc, data.keyDrivers);
  y = ensureSpace(doc, data, y, driversH);
  y = drawKeyDrivers(doc, data.keyDrivers, y);

  const methH = calcMethodologyHeight(doc, data);
  y = ensureSpace(doc, data, y, methH);
  y = drawMethodology(doc, data, y);

  // Disclaimer: always keep whole — move to new page if it cannot fit safely
  const discH = calcDisclaimerHeight(doc, data.disclaimer);
  y = ensureSpace(doc, data, y, discH);
  drawDisclaimer(doc, data.disclaimer, y);

  // ── Footers: drawn last via setPage so total page count is known ───────────
  const totalPages = doc.getNumberOfPages() as number;
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    drawFooter(doc, pg, totalPages, data);
  }

  return doc;
}

// ─── Browser entry point ──────────────────────────────────────────────────────

export async function generatePDF(data: ReportData, filename: string): Promise<void> {
  const doc = await buildReportDocument(data);

  try {
    doc.save(filename);
  } catch {
    try {
      const blob: Blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } catch {
      const blob: Blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    }
  }
}
