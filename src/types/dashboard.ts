/**
 * Dashboard Types
 * Extracted from Dashboard.tsx for better modularity
 */

export interface KPIData {
  totalSales: number;
  activeLeads: number;
  activeJobs: number;
  overdueInvoices: number;
  error?: string | null;
}

export interface ActivityItem {
  id: string;
  type: 'lead' | 'quote' | 'job' | 'invoice';
  title: string;
  subtitle: string;
  time: string;
  status: string;
  user?: string;
}

export interface AnimatedCounterProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  formatter?: (value: number) => string;
}

export interface ActivityDetailModalProps {
  activity: ActivityItem | null;
  isOpen: boolean;
  onClose: () => void;
}

// KPI Card configuration interface
export interface KPICardConfig {
  name: string;
  subtitle: string;
  value: number;
  change: number;
  changeType: 'positive' | 'negative';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  sparklineColor: string;
  formatter: (value: number) => string;
}

// Quick action configuration interface
export interface QuickActionConfig {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  href: string;
  shortcut: string;
}

// Recharts Tooltip Types
export interface TooltipPayloadEntry {
  name: string;
  value: number;
  color?: string;
  dataKey?: string;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

// Chart Data Item Types
export interface JobStatusItem {
  name: string;
  antal: number;
  fill?: string;
}

export interface SalesDataItem {
  månad: string;
  försäljning: number;
}

export interface LeadStatusItem {
  name: string;
  value: number;
  fill?: string;
}

// Analytics Data Types
export interface SalesTrendItem {
  månad: string;
  intäkter: number;
  affärer: number;
  genomsnittligAffär: number;
  målIntäkter: number;
}

export interface LeadAnalyticsItem {
  källa: string;
  leads: number;
  konverteringar: number;
  konverteringsgrad: number;
  genomsnittligSvarstid: number;
  kostnadPerLead: number;
}

export interface CustomerMetricsItem {
  segment: string;
  antal: number;
  genomsnittligVärde: number;
  livstidsvärde: number;
  nöjdhet: number;
}

export interface FinancialDataItem {
  månad: string;
  intäkter: number;
  kostnader: number;
  vinst: number;
  vinstmarginal: number;
  utestående: number;
  kassaflöde: number;
}

export interface TeamPerformanceItem {
  namn: string;
  leads: number;
  affärer: number;
  intäkter: number;
  konverteringsgrad: number;
  genomsnittligAffärstid: number;
  kundnöjdhet: string;
  måluppfyllelse: number;
}

// ==========================================
// Dashboard Preferences & Settings
// ==========================================

export type DashboardWidgetId =
  | 'morning_briefing'
  | 'sales_goal'
  | 'leaderboard'
  | 'my_day'
  | 'scratchpad'
  | 'cash_flow'
  | 'kpis'
  | 'sales_chart'
  | 'lead_distribution'
  | 'activity_feed'
  | 'tasks'
  | 'job_status'
  | 'intranet'
  | 'weather'
  | 'world_clock'
  | 'quote_activity';

export interface DashboardSettings {
  visible_widgets: DashboardWidgetId[];
  sales_goal_target: number;
  scratchpad_content: string;
  layout_order: DashboardWidgetId[];

  // Widget specific settings
  weather_city: string;
  weather_lat: number;
  weather_lon: number;
  clock_timezones: string[];
}

export const DEFAULT_WIDGETS_SALES: DashboardWidgetId[] = [
  'morning_briefing',
  'sales_goal',
  'quote_activity',
  'leaderboard',
  'world_clock',
  'weather',
  'my_day',
  'kpis',
  'sales_chart',
  'activity_feed'
];

export const DEFAULT_WIDGETS_WORKER: DashboardWidgetId[] = [
  'morning_briefing',
  'world_clock',
  'weather',
  'my_day',
  'scratchpad',
  'job_status',
  'intranet'
];

export const DEFAULT_WIDGETS_ADMIN: DashboardWidgetId[] = [
  'morning_briefing',
  'cash_flow',
  'quote_activity',
  'world_clock',
  'weather',
  'sales_goal',
  'leaderboard',
  'kpis',
  'sales_chart',
  'lead_distribution',
  'activity_feed',
  'job_status'
];

export const ALL_WIDGETS: { id: DashboardWidgetId; label: string; roles?: string[] }[] = [
  { id: 'morning_briefing', label: 'Morgonrapport' },
  { id: 'sales_goal', label: 'Säljmål & Ring', roles: ['admin', 'sales'] },
  { id: 'quote_activity', label: 'Offertaktivitet', roles: ['admin', 'sales'] },
  { id: 'leaderboard', label: 'Topplista', roles: ['admin', 'sales'] },
  { id: 'my_day', label: 'Min Dag (Kalender & Uppgifter)' },
  { id: 'scratchpad', label: 'Anteckningar' },
  { id: 'cash_flow', label: 'Kassaflöde', roles: ['admin', 'finance'] },
  { id: 'kpis', label: 'Nyckeltal (KPI)' },
  { id: 'sales_chart', label: 'Försäljningsgraf' },
  { id: 'lead_distribution', label: 'Lead-fördelning' },
  { id: 'activity_feed', label: 'Aktivitetsflöde' },
  { id: 'tasks', label: 'Uppgifter (Gammal vy)' },
  { id: 'job_status', label: 'Jobbstatus' },
  { id: 'intranet', label: 'Intranät' },
  { id: 'weather', label: 'Väder' },
  { id: 'world_clock', label: 'Världsklocka' }
];
