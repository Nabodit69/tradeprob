export type Session = 'London' | 'New York' | 'Asia' | 'Opening' | 'Mid Market' | 'Last Hour';
export type Result = 'Win' | 'Loss';
export type SetupType = 'Breakout' | 'Retest' | 'Trend' | 'Counter-Trend' | 'News';
export type MarketScope = 'indian' | 'global';

export interface Strategy {
  id: string;
  userId: string;
  name: string;
  targetWinRate: number;
  description?: string;
  isArchived?: boolean;
  createdAt: string;
  marketScope?: MarketScope;
}

export interface Trade {
  id: string;
  userId: string;
  strategyId: string;
  entryTime: string;
  exitTime: string;
  dayOfWeek: string;
  session: Session;
  setup: SetupType;
  result: Result;
  pips: number;
  slPips?: number;
  tpPips?: number;
  notes?: string;
  screenshotUrl?: string;
  durationMinutes: number;
  createdAt: string;
}

export interface Stats {
  totalTrades: number;
  actualWinRate: number;
  avgWinPips: number;
  avgLossPips: number;
  avgSLPips: number;
  avgTPPips: number;
  riskReward: number;
  currentStreak: number;
  streakType: Result;
  varianceFromTarget: number;
}