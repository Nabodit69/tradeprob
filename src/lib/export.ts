import { Trade } from '../types';
import { format } from 'date-fns';

export const exportTradesToCSV = (trades: Trade[], strategyName: string) => {
  if (trades.length === 0) return;

  const headers = [
    'Date',
    'Time',
    'Session',
    'Setup',
    'Result',
    'Pips',
    'Duration (Min)',
    'SL (Pips)',
    'TP (Pips)',
    'Notes',
    'Screenshot URL'
  ];

  const rows = trades.map(t => [
    format(new Date(t.entryTime), 'yyyy-MM-dd'),
    format(new Date(t.entryTime), 'HH:mm'),
    t.session,
    t.setup,
    t.result,
    t.pips,
    t.durationMinutes,
    t.slPips || '',
    t.tpPips || '',
    (t.notes || '').replace(/"/g, '""'), // Escape quotes
    t.screenshotUrl || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = `${strategyName.replace(/\s+/g, '_')}_trades_${format(new Date(), 'yyyyMMdd')}.csv`;
  
  // Append to body to ensure it's in the DOM for restricted environments
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
};
