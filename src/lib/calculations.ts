import { format, getHours, differenceInMinutes, parseISO } from 'date-fns';
import { Result, Session, SetupType, Trade } from '../types';

export const getSession = (time: string): Session => {
  const date = parseISO(time);
  const hour = getHours(date); // UTC Hours

  // Simple hardcoded session logic (can be adjusted for local time)
  // London: 08:00 - 16:00 UTC
  // NY: 13:00 - 21:00 UTC
  // Asia: 22:00 - 07:00 UTC
  if (hour >= 8 && hour < 13) return 'London';
  if (hour >= 13 && hour < 18) return 'New York';
  return 'Asia';
};

export const calculateTradeData = (
  entry: string,
  exit: string,
  setup: SetupType,
  result: Result,
  pips: number,
  userId: string,
  strategyId: string,
  slPips?: number,
  tpPips?: number,
  notes?: string,
  screenshotUrl?: string
): Trade => {
  const entryDate = parseISO(entry);
  const exitDate = parseISO(exit);

  const trade: Trade = {
    id: crypto.randomUUID(),
    userId,
    strategyId,
    entryTime: entry,
    exitTime: exit,
    dayOfWeek: format(entryDate, 'EEEE'),
    session: getSession(entry),
    setup,
    result,
    pips: result === 'Loss' ? -Math.abs(pips) : Math.abs(pips),
    durationMinutes: differenceInMinutes(exitDate, entryDate),
    createdAt: new Date().toISOString()
  };

  if (slPips !== undefined) trade.slPips = slPips;
  if (tpPips !== undefined) trade.tpPips = tpPips;
  if (notes !== undefined) trade.notes = notes;
  if (screenshotUrl !== undefined) trade.screenshotUrl = screenshotUrl;

  return trade;
};

export const calculateProbabilities = (targetWinRate: number, streak: number, streakType: Result) => {
  const p = targetWinRate / 100;
  const q = 1 - p;

  if (streakType === 'Loss') {
    // Probability of next trade being a loss (Current Streak Continuing)
    // Actually, independent events mean next is always Q, but streak probability is Q^(n+1)
    const probContinuing = Math.pow(q, streak + 1);
    const probEnding = 1 - probContinuing;
    return { probContinuing, probEnding };
  } else {
    const probContinuing = Math.pow(p, streak + 1);
    const probEnding = 1 - probContinuing;
    return { probContinuing, probEnding };
  }
};
