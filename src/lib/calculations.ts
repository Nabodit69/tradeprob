import { format, getHours, getMinutes, differenceInMinutes, parseISO } from 'date-fns';
import { Result, Session, SetupType, Trade } from '../types';

// Global Forex sessions (UTC)
export const getGlobalSession = (time: string): Session => {
  const date = parseISO(time);
  const hour = getHours(date);
  if (hour >= 8 && hour < 13) return 'London';
  if (hour >= 13 && hour < 18) return 'New York';
  return 'Asia';
};

// Indian market sessions (IST = UTC+5:30)
export const getIndianSession = (time: string): Session => {
  const date = parseISO(time);
  // Convert UTC to IST
  const istMinutes = getHours(date) * 60 + getMinutes(date) + 330; // +5:30
  const istNorm = ((istMinutes % 1440) + 1440) % 1440; // normalize to 0-1440
  const istHour = Math.floor(istNorm / 60);
  const istMin = istNorm % 60;
  const totalMin = istHour * 60 + istMin;

  // Opening Hours: 9:15 - 11:00
  if (totalMin >= 555 && totalMin < 660) return 'Opening';
  // Mid Market: 11:00 - 13:00
  if (totalMin >= 660 && totalMin < 780) return 'Mid Market';
  // Last Hour: 13:00 - 15:30
  if (totalMin >= 780 && totalMin < 930) return 'Last Hour';
  return 'Opening'; // fallback
};

export const getSession = (time: string, isIndian = false): Session => {
  return isIndian ? getIndianSession(time) : getGlobalSession(time);
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
  screenshotUrl?: string,
  isIndian = false
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
    session: getSession(entry, isIndian),
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
    const probContinuing = Math.pow(q, streak + 1);
    return { probContinuing, probEnding: 1 - probContinuing };
  } else {
    const probContinuing = Math.pow(p, streak + 1);
    return { probContinuing, probEnding: 1 - probContinuing };
  }
};