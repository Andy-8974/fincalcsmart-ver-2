export type AccentColor = 'teal' | 'amber' | 'red' | 'slate';
export type StatusType = 'success' | 'warning' | 'danger' | 'neutral';

export interface MetricItem {
  label: string;
  value: string;
  sub?: string;
  accent?: AccentColor;
}

export interface InputRow {
  label: string;
  value: string;
}

export interface ResultRow {
  label: string;
  value: string;
  accent?: AccentColor;
}

export interface CompositionSegment {
  label: string;
  valueFormatted: string;
  pct: number; // 0..1 proportion
  color: 'teal' | 'slate' | 'amber';
}

export interface ReportHeader {
  brandName: string;
  calculatorName: string;
  reportSubtitle: string;
  generatedAt: string;
  scenarioId: string;
  region: string;
  currency: string;
  sourceUrl: string;
}

export interface ExecutiveSummary {
  metrics: MetricItem[];
  statusLabel: string;
  statusType: StatusType;
}

export interface CompositionBar {
  title: string;
  segments: CompositionSegment[];
  totalFormatted: string;
}

export interface InsightBlock {
  title: string;
  paragraphs: string[];
}

export interface InputSection {
  title: string;
  rows: InputRow[];
}

export interface ResultSection {
  title: string;
  rows: ResultRow[];
}

export interface MethodologySection {
  whatItDoes: string[];
  notModeled: string[];
}

export interface ReportData {
  header: ReportHeader;
  executiveSummary: ExecutiveSummary;
  compositionBar: CompositionBar;
  insightBlock: InsightBlock;
  inputs: InputSection;
  results: ResultSection;
  keyDrivers: string[];
  methodology: MethodologySection;
  disclaimer: string;
}
