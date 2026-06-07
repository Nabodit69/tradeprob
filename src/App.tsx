import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, Clock, Calendar, Target, Plus, Trash2, Activity,
  History, AlertTriangle, Zap, LogOut, ShieldCheck, Image as ImageIcon,
  FileText, Archive, ArchiveRestore, Download, Share2, Check, X, Menu
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { Trade, SetupType, Result, Stats, Strategy } from './types';
import { calculateTradeData, calculateProbabilities } from './lib/calculations';
import { supabase, signInWithGoogle, logout } from './lib/supabase';
import { exportTradesToCSV } from './lib/export';
import type { User } from '@supabase/supabase-js';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [activeStrategyId, setActiveStrategyId] = useState<string | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isAddingTradeMode, setIsAddingTradeMode] = useState(false);
  const [isAddingStrategyMode, setIsAddingStrategyMode] = useState(false);
  const [strategyTab, setStrategyTab] = useState<'active' | 'archived'>('active');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [strategyToDelete, setStrategyToDelete] = useState<string | null>(null);
  const [tradeToDelete, setTradeToDelete] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'strategies' | 'dashboard'>('dashboard');
  const [showSidebar, setShowSidebar] = useState(false);

  const activeStrategy = useMemo(() => strategies.find(s => s.id === activeStrategyId), [strategies, activeStrategyId]);

  const [newTrade, setNewTrade] = useState({
    entry: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    exit: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    setup: 'Breakout' as SetupType,
    result: 'Win' as Result,
    pips: 0, slPips: 0, tpPips: 0, notes: '', screenshotUrl: ''
  });

  const [newStrategy, setNewStrategy] = useState({ name: '', targetWinRate: 70, description: '' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchStrategies = async () => {
      const { data } = await supabase.from('strategies').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) {
        const mapped: Strategy[] = data.map(s => ({ id: s.id, userId: s.user_id, name: s.name, targetWinRate: s.target_win_rate, description: s.description, isArchived: s.is_archived, createdAt: s.created_at }));
        setStrategies(mapped);
        if (mapped.length > 0 && !activeStrategyId) setActiveStrategyId(mapped[0].id);
      }
    };
    fetchStrategies();
    const channel = supabase.channel('strategies').on('postgres_changes', { event: '*', schema: 'public', table: 'strategies', filter: `user_id=eq.${user.id}` }, fetchStrategies).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (!user || !activeStrategyId) { setTrades([]); return; }
    const fetchTrades = async () => {
      const { data } = await supabase.from('trades').select('*').eq('user_id', user.id).eq('strategy_id', activeStrategyId).order('created_at', { ascending: false });
      if (data) {
        const mapped: Trade[] = data.map(t => ({ id: t.id, userId: t.user_id, strategyId: t.strategy_id, entryTime: t.entry_time, exitTime: t.exit_time, dayOfWeek: t.day_of_week, session: t.session, setup: t.setup, result: t.result, pips: t.pips, slPips: t.sl_pips, tpPips: t.tp_pips, notes: t.notes, screenshotUrl: t.screenshot_url, durationMinutes: t.duration_minutes, createdAt: t.created_at }));
        setTrades(mapped);
      }
    };
    fetchTrades();
    const channel = supabase.channel('trades').on('postgres_changes', { event: '*', schema: 'public', table: 'trades', filter: `strategy_id=eq.${activeStrategyId}` }, fetchTrades).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, activeStrategyId]);

  const stats: Stats = useMemo(() => {
    const winRateTarget = activeStrategy?.targetWinRate || 70;
    const wins = trades.filter(t => t.result === 'Win');
    const losses = trades.filter(t => t.result === 'Loss');
    const avgWin = wins.length ? wins.reduce((a, c) => a + c.pips, 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((a, c) => a + c.pips, 0) / losses.length) : 0;
    const tradesWithSL = trades.filter(t => t.slPips && t.slPips > 0);
    const tradesWithTP = trades.filter(t => t.tpPips && t.tpPips > 0);
    const avgSL = tradesWithSL.length ? tradesWithSL.reduce((a, c) => a + (c.slPips || 0), 0) / tradesWithSL.length : 0;
    const avgTP = tradesWithTP.length ? tradesWithTP.reduce((a, c) => a + (c.tpPips || 0), 0) / tradesWithTP.length : 0;
    let currentStreak = 0;
    let streakType: Result = trades.length > 0 ? trades[0].result : 'Win';
    if (trades.length > 0) { streakType = trades[0].result; for (const t of trades) { if (t.result === streakType) currentStreak++; else break; } }
    const actualWinRate = trades.length ? (wins.length / trades.length) * 100 : 0;
    return { totalTrades: trades.length, actualWinRate, avgWinPips: avgWin, avgLossPips: avgLoss, avgSLPips: avgSL, avgTPPips: avgTP, riskReward: avgLoss !== 0 ? avgWin / avgLoss : 0, currentStreak, streakType, varianceFromTarget: actualWinRate - winRateTarget };
  }, [trades, activeStrategy]);

  const probStats = useMemo(() => calculateProbabilities(activeStrategy?.targetWinRate || 70, stats.currentStreak, stats.streakType), [activeStrategy, stats]);

  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeStrategyId) return;
    const tradeData = calculateTradeData(newTrade.entry, newTrade.exit, newTrade.setup, newTrade.result, newTrade.pips, user.id, activeStrategyId, newTrade.slPips || undefined, newTrade.tpPips || undefined, newTrade.notes || undefined, newTrade.screenshotUrl || undefined);
    await supabase.from('trades').insert({ id: tradeData.id, user_id: tradeData.userId, strategy_id: tradeData.strategyId, entry_time: tradeData.entryTime, exit_time: tradeData.exitTime, day_of_week: tradeData.dayOfWeek, session: tradeData.session, setup: tradeData.setup, result: tradeData.result, pips: tradeData.pips, sl_pips: tradeData.slPips ?? null, tp_pips: tradeData.tpPips ?? null, notes: tradeData.notes ?? null, screenshot_url: tradeData.screenshotUrl ?? null, duration_minutes: tradeData.durationMinutes, created_at: tradeData.createdAt });
    setIsAddingTradeMode(false);
    setNewTrade({ ...newTrade, pips: 0, slPips: 0, tpPips: 0, notes: '', screenshotUrl: '' });
  };

  const handleAddStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { data } = await supabase.from('strategies').insert({ user_id: user.id, name: newStrategy.name, target_win_rate: newStrategy.targetWinRate, description: newStrategy.description, is_archived: false, created_at: new Date().toISOString() }).select().single();
    if (data) setActiveStrategyId(data.id);
    setIsAddingStrategyMode(false);
    setNewStrategy({ name: '', targetWinRate: 70, description: '' });
  };

  const deleteTrade = async (id: string) => { await supabase.from('trades').delete().eq('id', id); setTradeToDelete(null); };
  const archiveStrategy = async (id: string, isArchived: boolean) => { await supabase.from('strategies').update({ is_archived: !isArchived }).eq('id', id); };
  const deleteStrategy = async (id: string) => { await supabase.from('strategies').delete().eq('id', id); if (activeStrategyId === id) setActiveStrategyId(null); setStrategyToDelete(null); };

  const shareStrategy = (s: Strategy) => {
    const url = window.location.href.split('?')[0];
    const text = `🚀 Check out my ${s.name} strategy on TradeProb!\n\nTarget: ${s.targetWinRate}%\n${s.description || ''}\n\n${url}`;
    try { navigator.clipboard.writeText(text).then(() => { setCopySuccess(s.id); setTimeout(() => setCopySuccess(null), 2000); }); } catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); setCopySuccess(s.id); setTimeout(() => setCopySuccess(null), 2000); }
  };

  const filteredStrategies = useMemo(() => strategies.filter(s => strategyTab === 'archived' ? s.isArchived : !s.isArchived), [strategies, strategyTab]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Zap className="text-blue-600 animate-pulse" size={48} />
        <p className="text-slate-500 font-medium animate-pulse">Syncing Engine...</p>
      </div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-slate-100">
        <div className="bg-blue-600 w-14 h-14 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-blue-200"><Zap size={28} /></div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">TradeProb</h1>
        <p className="text-slate-500 mb-8 text-sm leading-relaxed">Professional trading probability analytics</p>
        <button onClick={signInWithGoogle} className="w-full bg-slate-900 text-white py-3.5 px-6 rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl">
          <ShieldCheck size={18} /> Continue with Google
        </button>
        <p className="text-[10px] uppercase font-bold text-slate-300 mt-6 tracking-widest">Secured by Supabase</p>
      </div>
    </div>
  );

  const displayName = user.user_metadata?.full_name || user.email;
  const photoURL = user.user_metadata?.avatar_url;

  const StrategySidebar = () => (
    <div className="space-y-4">
      {/* Strategy Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Target size={12} /> My Strategies</h2>
          <button onClick={() => setIsAddingStrategyMode(true)} className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white hover:bg-blue-700 transition-colors"><Plus size={14} /></button>
        </div>
        <div className="flex gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100">
          <button onClick={() => setStrategyTab('active')} className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${strategyTab === 'active' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>Active</button>
          <button onClick={() => setStrategyTab('archived')} className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${strategyTab === 'archived' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>Archived</button>
        </div>
        <div className="mt-3 space-y-2">
          {filteredStrategies.length > 0 ? filteredStrategies.map(s => (
            <div key={s.id} className="relative">
              <div onClick={() => { setActiveStrategyId(s.id); setShowSidebar(false); }} className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${activeStrategyId === s.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold truncate ${activeStrategyId === s.id ? 'text-blue-700' : 'text-slate-700'}`}>{s.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Target: {s.targetWinRate}%</p>
                  </div>
                  <div className="flex items-center gap-0.5 ml-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => shareStrategy(s)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors" title="Share">{copySuccess === s.id ? <Check size={12} className="text-emerald-500" /> : <Share2 size={12} />}</button>
                    <button onClick={() => archiveStrategy(s.id, !!s.isArchived)} className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors" title={s.isArchived ? 'Restore' : 'Archive'}>{s.isArchived ? <ArchiveRestore size={12} /> : <Archive size={12} />}</button>
                    <button onClick={() => { if (activeStrategyId === s.id && trades.length > 0) exportTradesToCSV(trades, s.name); }} className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors" title="Export"><Download size={12} /></button>
                    <button onClick={() => setStrategyToDelete(s.id)} className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors" title="Delete"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
              <AnimatePresence>
                {strategyToDelete === s.id && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 bg-white/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-2">
                    <p className="text-[10px] font-black text-rose-600 uppercase">Delete Strategy?</p>
                    <div className="flex gap-2">
                      <button onClick={() => deleteStrategy(s.id)} className="px-3 py-1 bg-rose-600 text-white text-[10px] font-bold rounded-lg">Yes</button>
                      <button onClick={() => setStrategyToDelete(null)} className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg">No</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )) : (
            <div className="text-center py-4 border-2 border-dashed border-slate-100 rounded-xl">
              <p className="text-xs text-slate-400 mb-2">No {strategyTab} strategies</p>
              {strategyTab === 'active' && <button onClick={() => setIsAddingStrategyMode(true)} className="text-xs font-bold text-blue-600 hover:underline">Create first strategy</button>}
            </div>
          )}
        </div>
      </div>

      {/* Probability Engine */}
      {activeStrategy ? (
        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3 opacity-10"><Activity size={100} /></div>
          <h2 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-1.5 relative z-10"><Zap size={12} /> {activeStrategy.name}</h2>
          <div className="relative z-10">
            <p className="text-slate-400 text-[10px] mb-1">Current Streak</p>
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-4xl font-bold font-mono ${stats.streakType === 'Win' ? 'text-emerald-400' : 'text-rose-400'}`}>{stats.currentStreak}</span>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Consecutive</p>
                <p className={`text-xs font-bold ${stats.streakType === 'Win' ? 'text-emerald-400' : 'text-rose-400'}`}>{stats.streakType}s</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800">
              <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                <p className="text-[9px] text-slate-500 uppercase font-black mb-1">Streak Gains</p>
                <p className="text-xl font-bold font-mono text-white">{(probStats.probContinuing * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                <p className="text-[9px] text-slate-500 uppercase font-black mb-1">Reversion</p>
                <p className="text-xl font-bold font-mono text-blue-400">{(probStats.probEnding * 100).toFixed(1)}%</p>
              </div>
            </div>
            {stats.streakType === 'Loss' && stats.currentStreak >= 3 && (
              <div className="mt-3 flex items-start gap-2 bg-amber-900/20 text-amber-300 p-2.5 rounded-xl border border-amber-900/40">
                <AlertTriangle className="shrink-0 mt-0.5" size={14} />
                <div className="text-[10px] leading-relaxed"><p className="font-bold">High Reversion Risk</p><p className="opacity-80">Scale down risk until streak breaks.</p></div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-100 p-6 rounded-2xl text-center border-2 border-dashed border-slate-200">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Select strategy to activate engine</p>
        </div>
      )}

      {/* Avg Win/Loss */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Win</p>
          <p className="text-lg font-bold text-emerald-600 font-mono">+{stats.avgWinPips.toFixed(1)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Loss</p>
          <p className="text-lg font-bold text-rose-600 font-mono">-{stats.avgLossPips.toFixed(1)}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen font-sans bg-slate-50/50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button onClick={() => setShowSidebar(true)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
              <Menu size={20} />
            </button>
            <div className="bg-blue-600 p-1.5 rounded-xl text-white shadow-md"><Zap size={18} /></div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 leading-none">TradeProb</h1>
              <div className="flex items-center gap-1 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Engine Active</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900 truncate max-w-[120px]">{displayName}</p>
                <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{user.email}</p>
              </div>
              {photoURL && <img src={photoURL} className="w-8 h-8 rounded-full ring-2 ring-slate-100 shrink-0" />}
              <button onClick={logout} className="text-slate-400 hover:text-rose-500 transition-colors p-1.5" title="Logout"><LogOut size={16} /></button>
            </div>
            <button onClick={() => setIsAddingTradeMode(true)} disabled={!activeStrategyId} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-3 py-2 rounded-xl flex items-center gap-1.5 font-bold transition-all shadow-lg shadow-blue-100 text-xs whitespace-nowrap">
              <Plus size={16} /><span className="hidden sm:inline">New Trade</span><span className="sm:hidden">Trade</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSidebar(false)} className="fixed inset-0 bg-slate-900/50 z-50 lg:hidden" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25 }} className="fixed left-0 top-0 bottom-0 w-80 bg-slate-50 z-50 lg:hidden overflow-y-auto p-4 scrollbar-hide">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-600 p-1.5 rounded-xl text-white"><Zap size={16} /></div>
                  <span className="font-bold text-slate-900">Strategies</span>
                </div>
                <button onClick={() => setShowSidebar(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-xl"><X size={18} /></button>
              </div>
              <StrategySidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-4 py-4 lg:px-6 lg:py-6">
        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-20">
              <StrategySidebar />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard label="Win Rate" value={`${stats.actualWinRate.toFixed(1)}%`} sub={`${stats.varianceFromTarget >= 0 ? '+' : ''}${stats.varianceFromTarget.toFixed(1)}% delta`} color={stats.varianceFromTarget >= 0 ? 'emerald' : 'amber'} icon={<History size={16} className="text-blue-500" />} />
              <MetricCard label="Avg TP" value={stats.avgTPPips.toFixed(1)} sub="pips" color={stats.avgTPPips >= stats.avgSLPips ? 'emerald' : 'amber'} icon={<TrendingUp size={16} className="text-emerald-500" />} />
              <MetricCard label="Avg SL" value={stats.avgSLPips.toFixed(1)} sub="pips" color="slate" icon={<AlertTriangle size={16} className="text-rose-500" />} />
              <MetricCard label="R/R Ratio" value={stats.riskReward.toFixed(2)} sub="realized" color={stats.riskReward >= 1.5 ? 'emerald' : 'slate'} icon={<Activity size={16} className="text-slate-500" />} />
            </div>

            {!activeStrategyId ? (
              <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                <Target size={48} className="text-slate-100 mb-4" />
                <h2 className="text-lg font-bold text-slate-400">No Strategy Selected</h2>
                <p className="text-slate-300 mt-1 text-sm">Tap the menu to select or create a strategy</p>
                <button onClick={() => setShowSidebar(true)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm lg:hidden">Open Strategies</button>
              </div>
            ) : (
              <>
                {/* Charts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-[10px] font-bold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-widest"><Clock size={14} className="text-blue-500" /> Session Expectancy</h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={processSessionData(trades)}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} />
                          <YAxis hide />
                          <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="winRate" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={36} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-[10px] font-bold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-widest"><Calendar size={14} className="text-blue-500" /> Day Distribution</h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={processDayData(trades)}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} width={55} />
                          <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                          <Bar dataKey="pips" fill="#10b981" radius={[0, 6, 6, 0]} barSize={22} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Trade Log */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <div className="flex items-center gap-2"><History size={14} className="text-slate-400" /><h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Trade Log</h3></div>
                    <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100 uppercase tracking-widest">{trades.length} Entries</span>
                  </div>

                  {/* Mobile Trade Cards */}
                  <div className="sm:hidden divide-y divide-slate-100">
                    {trades.map(trade => (
                      <div key={trade.id} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black ${trade.result === 'Win' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{trade.result[0]}</span>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${sessionColors(trade.session)}`}>{trade.session}</span>
                              <span className="text-[10px] font-bold text-slate-500 uppercase">{trade.setup}</span>
                            </div>
                            <p className="text-[10px] text-slate-400">{format(new Date(trade.entryTime), 'MMM dd, HH:mm')} · {trade.durationMinutes}m</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-mono font-bold text-sm ${trade.pips >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{trade.pips > 0 ? '+' : ''}{trade.pips.toFixed(1)}</p>
                            <p className="text-[9px] text-slate-400 font-mono">{trade.slPips ? `SL ${trade.slPips}` : ''} {trade.tpPips ? `TP ${trade.tpPips}` : ''}</p>
                          </div>
                        </div>
                        {trade.notes && <p className="text-[10px] text-slate-400 flex items-center gap-1"><FileText size={10} />{trade.notes}</p>}
                        <div className="flex justify-end mt-2">
                          {tradeToDelete === trade.id ? (
                            <div className="flex gap-1">
                              <button onClick={() => deleteTrade(trade.id)} className="bg-rose-500 text-white px-2 py-1 rounded text-[10px] font-bold">Yes</button>
                              <button onClick={() => setTradeToDelete(null)} className="bg-slate-200 text-slate-600 px-2 py-1 rounded text-[10px] font-bold">No</button>
                            </div>
                          ) : (
                            <button onClick={() => setTradeToDelete(trade.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1.5 rounded-lg hover:bg-rose-50"><Trash2 size={14} /></button>
                          )}
                        </div>
                      </div>
                    ))}
                    {trades.length === 0 && <div className="py-12 text-center"><p className="text-xs text-slate-300 font-bold uppercase tracking-widest">No trades yet</p></div>}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/30 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Session</th>
                          <th className="px-4 py-3">Setup</th>
                          <th className="px-4 py-3 text-center">Result</th>
                          <th className="px-4 py-3 text-right">Pips</th>
                          <th className="px-4 py-3 text-right">Duration</th>
                          <th className="px-4 py-3 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {trades.map(trade => (
                          <tr key={trade.id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-xs font-bold text-slate-900">{format(new Date(trade.entryTime), 'MMM dd')}</div>
                              <div className="text-[10px] text-slate-400 font-bold">{format(new Date(trade.entryTime), 'HH:mm')}</div>
                            </td>
                            <td className="px-4 py-3"><span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${sessionColors(trade.session)}`}>{trade.session}</span></td>
                            <td className="px-4 py-3">
                              <div className="text-[10px] font-bold text-slate-600 border-l-2 border-slate-200 pl-2 uppercase">{trade.setup}</div>
                              {trade.notes && <div className="flex items-center gap-1 mt-0.5 text-[9px] text-slate-400"><FileText size={9} /><span className="truncate max-w-[100px]">{trade.notes}</span></div>}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black ${trade.result === 'Win' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{trade.result[0]}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className={`font-mono font-bold text-xs ${trade.pips >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{trade.pips > 0 ? '+' : ''}{trade.pips.toFixed(1)}</div>
                              <div className="text-[9px] text-slate-400 font-mono">{trade.slPips ? `${trade.slPips} SL` : ''}{trade.tpPips ? ` | ${trade.tpPips} TP` : ''}</div>
                            </td>
                            <td className="px-4 py-3 text-right text-[10px] text-slate-500 font-mono font-bold">{trade.durationMinutes}m</td>
                            <td className="px-4 py-3 text-right">
                              {tradeToDelete === trade.id ? (
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => deleteTrade(trade.id)} className="bg-rose-500 text-white px-2 py-1 rounded text-[10px] font-bold">Yes</button>
                                  <button onClick={() => setTradeToDelete(null)} className="bg-slate-200 text-slate-600 px-2 py-1 rounded text-[10px] font-bold">No</button>
                                </div>
                              ) : (
                                <button onClick={() => setTradeToDelete(trade.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1.5 rounded-lg hover:bg-rose-50 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {trades.length === 0 && <div className="py-16 text-center"><p className="text-xs text-slate-300 font-bold uppercase tracking-widest">No trades yet</p></div>}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Trade Modal */}
      <Modal isOpen={isAddingTradeMode} onClose={() => setIsAddingTradeMode(false)} title="Log Trade">
        <form onSubmit={handleAddTrade} className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Entry Time</label>
              <input type="datetime-local" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium" value={newTrade.entry} onChange={e => setNewTrade({ ...newTrade, entry: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Exit Time</label>
              <input type="datetime-local" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium" value={newTrade.exit} onChange={e => setNewTrade({ ...newTrade, exit: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Setup</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700" value={newTrade.setup} onChange={e => setNewTrade({ ...newTrade, setup: e.target.value as SetupType })}>
                <option value="Breakout">Breakout</option>
                <option value="Retest">Retest</option>
                <option value="Trend">Trend</option>
                <option value="Counter-Trend">Counter-Trend</option>
                <option value="News">News</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Result</label>
              <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 h-[46px]">
                <button type="button" onClick={() => setNewTrade({ ...newTrade, result: 'Win' })} className={`flex-1 py-1 text-xs font-black rounded-lg transition-all uppercase ${newTrade.result === 'Win' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>Win</button>
                <button type="button" onClick={() => setNewTrade({ ...newTrade, result: 'Loss' })} className={`flex-1 py-1 text-xs font-black rounded-lg transition-all uppercase ${newTrade.result === 'Loss' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-400'}`}>Loss</button>
              </div>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Pips</label>
            <input type="number" step="0.1" required placeholder="0.0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-2xl font-bold font-mono focus:outline-none focus:border-blue-300 text-slate-900" value={newTrade.pips || ''} onChange={e => setNewTrade({ ...newTrade, pips: Number(e.target.value) })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">SL Pips</label>
              <input type="number" step="0.1" placeholder="0.0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold font-mono focus:outline-none" value={newTrade.slPips || ''} onChange={e => setNewTrade({ ...newTrade, slPips: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">TP Pips</label>
              <input type="number" step="0.1" placeholder="0.0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold font-mono focus:outline-none" value={newTrade.tpPips || ''} onChange={e => setNewTrade({ ...newTrade, tpPips: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Notes</label>
            <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-100" rows={2} placeholder="Why did you take this trade?" value={newTrade.notes} onChange={e => setNewTrade({ ...newTrade, notes: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Screenshot URL</label>
            <div className="relative">
              <input type="url" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-100" placeholder="https://www.tradingview.com/x/..." value={newTrade.screenshotUrl} onChange={e => setNewTrade({ ...newTrade, screenshotUrl: e.target.value })} />
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={13} />
            </div>
          </div>
          <button type="submit" className="w-full bg-slate-900 text-white rounded-xl py-3.5 font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-xs">
            <Activity size={16} /> Append to Log
          </button>
        </form>
      </Modal>

      {/* Strategy Modal */}
      <Modal isOpen={isAddingStrategyMode} onClose={() => setIsAddingStrategyMode(false)} title="New Strategy">
        <form onSubmit={handleAddStrategy} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Strategy Name</label>
            <input type="text" required placeholder="e.g. London Divergence" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-100" value={newStrategy.name} onChange={e => setNewStrategy({ ...newStrategy, name: e.target.value })} />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Win Rate Target: {newStrategy.targetWinRate}%</label>
            <input type="range" min="1" max="99" className="w-full accent-blue-600" value={newStrategy.targetWinRate} onChange={e => setNewStrategy({ ...newStrategy, targetWinRate: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Notes</label>
            <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-100" rows={3} placeholder="Brief description of strategy rules..." value={newStrategy.description} onChange={e => setNewStrategy({ ...newStrategy, description: e.target.value })} />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white rounded-xl py-3.5 font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-xs">
            <Target size={16} /> Create Strategy
          </button>
        </form>
      </Modal>
    </div>
  );
}

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="bg-white w-full sm:max-w-md relative z-10 font-sans overflow-y-auto scrollbar-hide rounded-t-3xl sm:rounded-3xl max-h-[92vh] shadow-2xl"
          >
            <div className="sticky top-0 bg-white px-6 pt-6 pb-4 border-b border-slate-100 z-10">
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden" />
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                <button onClick={onClose} className="text-slate-300 hover:text-slate-500 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"><X size={18} /></button>
              </div>
            </div>
            <div className="px-6 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function MetricCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = { emerald: 'text-emerald-600', amber: 'text-amber-500', slate: 'text-slate-400' };
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{label}</span></div>
      <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">{value}</p>
      <p className={`text-[10px] font-black uppercase mt-1 tracking-wider ${colors[color] || colors.slate}`}>{sub}</p>
    </div>
  );
}

const sessionColors = (session: string) => {
  switch (session) {
    case 'London': return 'bg-sky-50 text-sky-600 ring-1 ring-sky-100';
    case 'New York': return 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100';
    case 'Asia': return 'bg-amber-50 text-amber-600 ring-1 ring-amber-100';
    default: return 'bg-slate-50 text-slate-600';
  }
};

const processSessionData = (trades: Trade[]) => {
  const sessions: Record<string, { total: number; wins: number }> = { London: { total: 0, wins: 0 }, 'New York': { total: 0, wins: 0 }, Asia: { total: 0, wins: 0 } };
  trades.forEach(t => { if (sessions[t.session]) { sessions[t.session].total++; if (t.result === 'Win') sessions[t.session].wins++; } });
  return Object.entries(sessions).map(([name, data]) => ({ name: name.toUpperCase(), winRate: data.total ? (data.wins / data.total) * 100 : 0 }));
};

const processDayData = (trades: Trade[]) => {
  const days: Record<string, number> = {};
  trades.forEach(t => { days[t.dayOfWeek] = (days[t.dayOfWeek] || 0) + t.pips; });
  return Object.entries(days).sort((a, b) => b[1] - a[1]).map(([name, pips]) => ({ name: name.substring(0, 3).toUpperCase(), pips }));
};
