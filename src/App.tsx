import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Clock, 
  Calendar, 
  Target, 
  Plus,
  Minus,
  Trash2,
  Activity,
  History,
  AlertTriangle,
  Zap,
  LogOut,
  ChevronDown,
  Settings,
  ShieldCheck,
  Image as ImageIcon,
  FileText,
  Archive,
  ArchiveRestore,
  Download,
  Share2,
  MoreVertical,
  Copy,
  Check
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
} from 'recharts';
import { format } from 'date-fns';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  setDoc,
  deleteDoc,
  doc, 
  orderBy
} from 'firebase/firestore';
import { Trade, SetupType, Result, Stats, Strategy } from './types';
import { calculateTradeData, calculateProbabilities } from './lib/calculations';
import { auth, db, signInWithGoogle, logout, handleFirestoreError, OperationType } from './lib/firebase';
import { exportTradesToCSV } from './lib/export';
import LandingPage from './components/LandingPage';

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
  const [openStrategyMenuId, setOpenStrategyMenuId] = useState<string | null>(null);

  const [strategyToDelete, setStrategyToDelete] = useState<string | null>(null);
  const [tradeToDelete, setTradeToDelete] = useState<string | null>(null);

  const activeStrategy = useMemo(() => 
    strategies.find(s => s.id === activeStrategyId), 
    [strategies, activeStrategyId]
  );

  // Form States
  const [newTrade, setNewTrade] = useState({
    entry: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    exit: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    setup: 'Breakout' as SetupType,
    result: 'Win' as Result,
    pips: 0,
    slPips: 0,
    tpPips: 0,
    notes: '',
    screenshotUrl: ''
  });

  const [newStrategy, setNewStrategy] = useState({
    name: '',
    targetWinRate: 70,
    description: ''
  });

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        setDoc(doc(db, 'users', u.uid), {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${u.uid}`));
      }
    });
    return () => unsubscribe();
  }, []);

  // Strategies Listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'strategies'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Strategy));
      setStrategies(data);
      if (data.length > 0 && !activeStrategyId) {
        setActiveStrategyId(data[0].id);
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'strategies'));
    return () => unsubscribe();
  }, [user]);

  // Trades Listener
  useEffect(() => {
    if (!user || !activeStrategyId) {
      setTrades([]);
      return;
    };
    const q = query(
      collection(db, 'trades'), 
      where('userId', '==', user.uid),
      where('strategyId', '==', activeStrategyId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTrades(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trade)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'trades'));
    return () => unsubscribe();
  }, [user, activeStrategyId]);

  const stats: Stats = useMemo(() => {
    const winRateTarget = activeStrategy?.targetWinRate || 70;
    const wins = trades.filter(t => t.result === 'Win');
    const losses = trades.filter(t => t.result === 'Loss');
    const avgWin = wins.length ? wins.reduce((acc, curr) => acc + curr.pips, 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((acc, curr) => acc + curr.pips, 0) / losses.length) : 0;
    
    // Average SL/TP
    const tradesWithSL = trades.filter(t => t.slPips && t.slPips > 0);
    const tradesWithTP = trades.filter(t => t.tpPips && t.tpPips > 0);
    const avgSL = tradesWithSL.length ? tradesWithSL.reduce((acc, curr) => acc + (curr.slPips || 0), 0) / tradesWithSL.length : 0;
    const avgTP = tradesWithTP.length ? tradesWithTP.reduce((acc, curr) => acc + (curr.tpPips || 0), 0) / tradesWithTP.length : 0;

    let currentStreak = 0;
    let streakType: Result = trades.length > 0 ? trades[0].result : 'Win';
    if (trades.length > 0) {
      streakType = trades[0].result;
      for (const t of trades) {
        if (t.result === streakType) currentStreak++;
        else break;
      }
    }

    const actualWinRate = trades.length ? (wins.length / trades.length) * 100 : 0;

    return {
      totalTrades: trades.length,
      actualWinRate,
      avgWinPips: avgWin,
      avgLossPips: avgLoss,
      avgSLPips: avgSL,
      avgTPPips: avgTP,
      riskReward: avgLoss !== 0 ? avgWin / avgLoss : 0,
      currentStreak,
      streakType,
      varianceFromTarget: actualWinRate - winRateTarget
    };
  }, [trades, activeStrategy]);

  const probStats = useMemo(() => {
    const winRateTarget = activeStrategy?.targetWinRate || 70;
    return calculateProbabilities(winRateTarget, stats.currentStreak, stats.streakType);
  }, [activeStrategy, stats]);

  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeStrategyId) return;

    try {
      const tradeData = calculateTradeData(
        newTrade.entry,
        newTrade.exit,
        newTrade.setup,
        newTrade.result,
        newTrade.pips,
        user.uid,
        activeStrategyId,
        newTrade.slPips || undefined,
        newTrade.tpPips || undefined,
        newTrade.notes || undefined,
        newTrade.screenshotUrl || undefined
      );
      await addDoc(collection(db, 'trades'), tradeData);
      setIsAddingTradeMode(false);
      setNewTrade({ ...newTrade, pips: 0, slPips: 0, tpPips: 0, notes: '', screenshotUrl: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'trades');
    }
  };

  const handleAddStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const docRef = await addDoc(collection(db, 'strategies'), {
        userId: user.uid,
        name: newStrategy.name,
        targetWinRate: newStrategy.targetWinRate,
        description: newStrategy.description,
        createdAt: new Date().toISOString()
      });
      setActiveStrategyId(docRef.id);
      setIsAddingStrategyMode(false);
      setNewStrategy({ name: '', targetWinRate: 70, description: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'strategies');
    }
  };

  const deleteTrade = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'trades', id));
      setTradeToDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `trades/${id}`);
    }
  };

  const archiveStrategy = async (id: string, isArchived: boolean) => {
    try {
      await setDoc(doc(db, 'strategies', id), { isArchived: !isArchived }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `strategies/${id}`);
    }
  };

  const deleteStrategy = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'strategies', id));
      if (activeStrategyId === id) setActiveStrategyId(null);
      setStrategyToDelete(null);
    } catch (err) {
      console.error('Delete failed:', err);
      handleFirestoreError(err, OperationType.DELETE, `strategies/${id}`);
    }
  };

  const shareStrategy = (s: Strategy) => {
    const url = window.location.href.split('?')[0];
    const shareText = `🚀 Check out my ${s.name} trading strategy on TradeProb!\n\nTarget Win Rate: ${s.targetWinRate}%\nDescription: ${s.description || 'No description'}\n\nAnalyze your edge at: ${url}`;
    
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText).then(() => {
          setCopySuccess(s.id);
          setTimeout(() => setCopySuccess(null), 2000);
        });
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch (err) {
      // Fallback for non-secure contexts or restricted iframes
      const textArea = document.createElement("textarea");
      textArea.value = shareText;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopySuccess(s.id);
        setTimeout(() => setCopySuccess(null), 2000);
      } catch (copyErr) {
        console.error('Fallback copy failed', copyErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const filteredStrategies = useMemo(() => {
    return strategies.filter(s => 
      strategyTab === 'archived' ? s.isArchived : !s.isArchived
    );
  }, [strategies, strategyTab]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Zap className="text-blue-600 animate-pulse" size={48} />
          <p className="text-slate-500 font-medium animate-pulse">Syncing Engine...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage onSignIn={signInWithGoogle} />;
  }

  return (
    <div className="min-h-screen font-sans bg-slate-50/50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md">
              <Zap size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">TradeProb</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Engine Active</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* User Profile */}
            <div className="flex items-center gap-3 pr-6 border-r border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900">{user.displayName}</p>
                <p className="text-[10px] text-slate-400 font-medium">{user.email}</p>
              </div>
              {user.photoURL && <img src={user.photoURL} className="w-9 h-9 rounded-full ring-2 ring-slate-100" />}
              <button 
                id="logout-btn"
                onClick={logout}
                className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>

            <button 
              id="add-trade-btn"
              onClick={() => setIsAddingTradeMode(true)}
              disabled={!activeStrategyId}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-blue-100 text-sm"
            >
              <Plus size={18} />
              New Trade
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8 grid grid-cols-12 gap-8">
        
        {/* Left Column: Strategy Management & Probability */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          
          {/* Strategy Selector */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Target size={12} /> My Strategies
              </h2>
              <button 
                id="add-strategy-btn"
                onClick={() => setIsAddingStrategyMode(true)}
                className="text-blue-600 hover:text-blue-700 transition-colors"
                title="Add New Strategy"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="flex gap-2 p-1 bg-slate-50 rounded-xl mb-4 border border-slate-100">
              <button 
                onClick={() => setStrategyTab('active')}
                className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${strategyTab === 'active' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
              >
                Active
              </button>
              <button 
                onClick={() => setStrategyTab('archived')}
                className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${strategyTab === 'archived' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
              >
                Archived
              </button>
            </div>

            {filteredStrategies.length > 0 ? (
              <div className="space-y-4">
                {filteredStrategies.map((s) => (
                    <div key={s.id} className="relative group">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveStrategyId(s.id)}
                          className={`flex-1 text-left px-4 py-3 rounded-xl border transition-all flex items-center justify-between ${
                            activeStrategyId === s.id 
                              ? 'border-blue-600 bg-blue-50/50 shadow-sm' 
                              : 'border-slate-100 hover:border-slate-200 bg-white'
                          }`}
                        >
                          <div className="max-w-[80%]">
                            <p className={`text-sm font-bold truncate ${activeStrategyId === s.id ? 'text-blue-700' : 'text-slate-700'}`}>{s.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium tracking-tight">Target: {s.targetWinRate}%</p>
                          </div>
                          <div className="flex items-center gap-4">
                            {activeStrategyId === s.id && <ChevronDown size={14} className="text-blue-600 lg:group-hover:hidden" />}
                          </div>
                        </button>
                        
                        {/* Mobile Menu Trigger */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenStrategyMenuId(openStrategyMenuId === s.id ? null : s.id);
                          }}
                          className="lg:hidden p-3 text-slate-400 hover:bg-slate-100 rounded-xl border border-slate-100 transition-colors"
                        >
                          <MoreVertical size={18} />
                        </button>
                      </div>
                      
                      {/* Responsive Actions Overlay */}
                      <AnimatePresence>
                        {(openStrategyMenuId === s.id || activeStrategyId === s.id) && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ 
                              opacity: (openStrategyMenuId === s.id) ? 1 : undefined,
                              scale: (openStrategyMenuId === s.id) ? 1 : undefined,
                              y: (openStrategyMenuId === s.id) ? 0 : undefined
                            }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className={`absolute right-0 top-full mt-2 lg:mt-0 lg:top-1/2 lg:-translate-y-1/2 items-center gap-1 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xl z-50 transition-all duration-200
                              ${openStrategyMenuId === s.id 
                                ? 'flex ring-4 ring-blue-500/10' 
                                : 'hidden lg:flex lg:opacity-0 lg:group-hover:opacity-100 lg:scale-95 lg:group-hover:scale-100 lg:translate-x-4 lg:group-hover:translate-x-0 pointer-events-none lg:group-hover:pointer-events-auto'
                              }`}
                          >
                            <button 
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); shareStrategy(s); }}
                              className="p-3 lg:p-2 text-slate-500 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-colors"
                              title="Share Strategy"
                            >
                              {copySuccess === s.id ? <Check size={16} className="text-emerald-500" /> : <Share2 size={16} />}
                            </button>
                            <button 
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); archiveStrategy(s.id, !!s.isArchived); }}
                              className="p-3 lg:p-2 text-slate-500 hover:text-amber-600 rounded-xl hover:bg-amber-50 transition-colors"
                              title={s.isArchived ? "Restore Strategy" : "Archive Strategy"}
                            >
                              {s.isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                            </button>
                            <button 
                              onClick={(e) => { 
                                e.preventDefault(); 
                                e.stopPropagation(); 
                                if (trades.length === 0) {
                                  alert('No trades found for this strategy to export.');
                                } else {
                                  exportTradesToCSV(trades, s.name); 
                                }
                              }}
                              className={`p-3 lg:p-2 rounded-xl transition-colors ${activeStrategyId === s.id ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 cursor-not-allowed opacity-50'}`}
                              disabled={activeStrategyId !== s.id}
                              title={activeStrategyId === s.id ? "Export CSV" : "Select strategy first to export"}
                            >
                              <Download size={16} />
                            </button>
                            <div className="w-px h-4 bg-slate-100 mx-1 lg:hidden" />
                            <button 
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStrategyToDelete(s.id); }}
                              className="p-3 lg:p-2 text-rose-500 hover:text-rose-700 rounded-xl hover:bg-rose-50 transition-colors"
                              title="Delete Strategy"
                            >
                              <Trash2 size={16} />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Delete Confirmation Overlay */}
                      <AnimatePresence>
                        {strategyToDelete === s.id && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-[60] bg-white/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-2 text-center"
                          >
                            <p className="text-[10px] font-black text-rose-600 uppercase mb-2">Delete Strategy?</p>
                            <div className="flex gap-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); deleteStrategy(s.id); }}
                                className="px-3 py-1 bg-rose-600 text-white text-[10px] font-bold rounded-lg shadow-sm"
                              >
                                Yes
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setStrategyToDelete(null); }}
                                className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg"
                              >
                                No
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl">
                <p className="text-xs text-slate-400 mb-3">No {strategyTab} strategies</p>
                {strategyTab === 'active' && (
                  <button 
                    onClick={() => setIsAddingStrategyMode(true)}
                    className="text-xs font-bold text-blue-600 hover:underline transition-all"
                  >
                    Create Strategy #1
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Probability Engine Card */}
          {activeStrategy ? (
            <section className="bg-slate-900 text-white p-7 rounded-3xl shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Activity size={140} />
              </div>
              
              <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-8 relative z-10 flex items-center gap-2">
                <Zap size={14} /> Prob Range: {activeStrategy.name}
              </h2>

              <div className="space-y-8 relative z-10">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-slate-400 text-xs mb-2">Current Streak</p>
                    <div className="flex items-center gap-3">
                      <span className={`text-5xl font-bold font-mono tracking-tighter ${stats.streakType === 'Win' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {stats.currentStreak}
                      </span>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Consecutive</p>
                        <p className={`text-xs font-bold ${stats.streakType === 'Win' ? 'text-emerald-400' : 'text-rose-400'}`}>{stats.streakType}s</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <p className="text-slate-400 text-xs mb-4">Statistical Probability (Next Position)</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/40 p-4 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase font-black mb-1.5">Streak Gains</p>
                      <p className="text-2xl font-bold font-mono text-white">{(probStats.probContinuing * 100).toFixed(1)}%</p>
                    </div>
                    <div className="bg-slate-800/40 p-4 rounded-2xl border border-white/5 hover:bg-slate-800/60 transition-colors group">
                      <p className="text-[10px] text-slate-500 uppercase font-black mb-1.5 group-hover:text-blue-400 transition-colors">Reversion Likelihood</p>
                      <p className="text-2xl font-bold font-mono text-blue-400">{(probStats.probEnding * 100).toFixed(1)}%</p>
                    </div>
                  </div>

                  {stats.streakType === 'Loss' && stats.currentStreak >= 3 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 flex items-start gap-3 bg-amber-900/20 text-amber-300 p-3 rounded-xl border border-amber-900/40"
                    >
                      <AlertTriangle className="shrink-0 mt-0.5" size={16} />
                      <div className="text-xs leading-relaxed">
                        <p className="font-bold mb-0.5">High Reversion Risk</p>
                        <p className="text-[10px] opacity-80">Variance signal detected. Scale down risk until streak breaks.</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </section>
          ) : (
            <div className="bg-slate-100 p-10 rounded-3xl text-center flex flex-col items-center justify-center gap-4 border-2 border-dashed border-slate-200">
              <Settings className="text-slate-300" size={48} />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest leading-relaxed">Select strategy to activate probability engine</p>
            </div>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Avg Win</p>
              <p className="text-xl font-bold text-emerald-600 font-mono">+{stats.avgWinPips.toFixed(1)}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Avg Loss</p>
              <p className="text-xl font-bold text-rose-600 font-mono">-{stats.avgLossPips.toFixed(1)}</p>
            </div>
          </div>

        </div>

        {/* Right Column: Dashboard & Log */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          
          {/* Top Analytics Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricBox 
              icon={<History className="text-blue-500" size={20} />}
              label="Real Win Rate"
              value={`${stats.actualWinRate.toFixed(1)}%`}
              subValue={`${stats.varianceFromTarget >= 0 ? '+' : ''}${stats.varianceFromTarget.toFixed(1)}% delta`}
              status={stats.varianceFromTarget >= 0 ? 'good' : 'warning'}
            />
            <MetricBox 
              icon={<TrendingUp className="text-emerald-500" size={20} />}
              label="Avg TP Pips"
              value={stats.avgTPPips.toFixed(1)}
              subValue="Target profit efficiency"
              status={stats.avgTPPips >= stats.avgSLPips ? 'good' : 'warning'}
            />
            <MetricBox 
              icon={<AlertTriangle className="text-rose-500" size={20} />}
              label="Avg SL Pips"
              value={stats.avgSLPips.toFixed(1)}
              subValue="Risk exposure"
              status="neutral"
            />
            <MetricBox 
              icon={<Activity className="text-slate-500" size={20} />}
              label="R/R Ratio"
              value={stats.riskReward.toFixed(2)}
              subValue="Realized efficiency"
              status={stats.riskReward >= 1.5 ? 'good' : 'neutral'}
            />
          </div>

          {!activeStrategyId ? (
            <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
               <Target size={64} className="text-slate-100 mb-6" />
               <h2 className="text-xl font-bold text-slate-400 leading-tight">Initialize Your Strategy Portfolio</h2>
               <p className="text-slate-300 mt-2 text-sm">Create your first strategy to start tracking performance</p>
            </div>
          ) : (
            <>
              {/* Charts Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-900 mb-8 flex items-center gap-2 uppercase tracking-widest">
                    <Clock size={16} className="text-blue-500" /> Session Expectancy
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={processSessionData(trades)}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                        <YAxis hide />
                        <Tooltip 
                          cursor={{fill: '#f8fafc'}}
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        />
                        <Bar dataKey="winRate" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={44} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-900 mb-8 flex items-center gap-2 uppercase tracking-widest">
                    <Calendar size={16} className="text-blue-500" /> Day Distribution
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart layout="vertical" data={processDayData(trades)}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} width={70} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none'}} />
                        <Bar dataKey="pips" fill="#10b981" radius={[0, 6, 6, 0]} barSize={28} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Trade Log Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                  <div className="flex items-center gap-2">
                    <History size={16} className="text-slate-400" />
                    <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Trade Log</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100 uppercase tracking-widest">{trades.length} Entries</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/30 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                        <th className="px-8 py-4">Timeline</th>
                        <th className="px-8 py-4">Window</th>
                        <th className="px-8 py-4">Mechanism</th>
                        <th className="px-8 py-4 text-center">Outcome</th>
                        <th className="px-8 py-4 text-right">Magnitude</th>
                        <th className="px-8 py-4 text-right">Runtime</th>
                        <th className="px-8 py-4 text-right">Ops</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {trades.map((trade) => (
                        <tr key={trade.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-5 whitespace-nowrap">
                            <div className="text-xs font-bold text-slate-900">{format(new Date(trade.entryTime), 'MMM dd')}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{format(new Date(trade.entryTime), 'HH:mm')}</div>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${sessionColors(trade.session)}`}>
                              {trade.session}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="text-[10px] font-bold text-slate-600 border-l-2 border-slate-200 pl-2 uppercase">{trade.setup}</div>
                            {trade.notes && (
                              <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-400 font-medium">
                                <FileText size={10} />
                                <span className="truncate max-w-[120px]">{trade.notes}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-8 py-5 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black ${trade.result === 'Win' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {trade.result[0]}
                              </span>
                              {trade.screenshotUrl && (
                                <a 
                                  href={trade.screenshotUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-[9px] text-blue-500 font-bold hover:underline flex items-center gap-0.5"
                                >
                                  <ImageIcon size={10} /> Chart
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                             <div className={`font-mono font-bold text-xs ${trade.pips >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {trade.pips > 0 ? '+' : ''}{trade.pips.toFixed(1)}
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono mt-1">
                              {trade.slPips && `${trade.slPips} SL`} {trade.tpPips && `| ${trade.tpPips} TP`}
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right text-[10px] text-slate-500 font-mono font-bold">
                            {trade.durationMinutes}M
                          </td>
                          <td className="px-8 py-5 text-right relative">
                            {tradeToDelete === trade.id ? (
                              <div className="flex items-center justify-end gap-1 scale-90 origin-right">
                                <button 
                                  onClick={() => deleteTrade(trade.id)}
                                  className="bg-rose-500 text-white px-2 py-1 rounded text-[10px] font-bold"
                                >
                                  Yes
                                </button>
                                <button 
                                  onClick={() => setTradeToDelete(null)}
                                  className="bg-slate-200 text-slate-600 px-2 py-1 rounded text-[10px] font-bold"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setTradeToDelete(trade.id)}
                                className="text-slate-300 hover:text-rose-500 transition-colors p-2.5 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100 sm:opacity-0 group-hover:opacity-100"
                                title="Delete Record"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {trades.length === 0 && (
                  <div className="py-24 text-center">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <History size={24} className="text-slate-200" />
                    </div>
                    <p className="text-xs text-slate-300 font-bold uppercase tracking-widest">Engine Data Empty</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Trade Entry Modal */}
      <Modal isOpen={isAddingTradeMode} onClose={() => setIsAddingTradeMode(false)} title="Log Performance">
        <form onSubmit={handleAddTrade} className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Entry Timestamp</label>
              <input 
                type="datetime-local" 
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                value={newTrade.entry}
                onChange={e => setNewTrade({...newTrade, entry: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Exit Timestamp</label>
              <input 
                type="datetime-local" 
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                value={newTrade.exit}
                onChange={e => setNewTrade({...newTrade, exit: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Setup Logic</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700"
                value={newTrade.setup}
                onChange={e => setNewTrade({...newTrade, setup: e.target.value as SetupType})}
              >
                <option value="Breakout">Breakout</option>
                <option value="Retest">Retest</option>
                <option value="Trend">Trend</option>
                <option value="Counter-Trend">Counter-Trend</option>
                <option value="News">News</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Resolution</label>
              <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-200 h-[46px]">
                <button 
                  type="button"
                  onClick={() => setNewTrade({...newTrade, result: 'Win'})}
                  className={`flex-1 py-1 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${newTrade.result === 'Win' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Win
                </button>
                <button 
                  type="button"
                  onClick={() => setNewTrade({...newTrade, result: 'Loss'})}
                  className={`flex-1 py-1 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${newTrade.result === 'Loss' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Loss
                </button>
              </div>
            </div>
          </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Magnitude (Pips)</label>
              <input 
                type="number" 
                step="0.1"
                required
                placeholder="0.0"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-2xl font-bold font-mono focus:outline-none focus:border-blue-300 transition-all text-slate-900"
                value={newTrade.pips || ''}
                onChange={e => setNewTrade({...newTrade, pips: Number(e.target.value)})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Planned SL (Pips)</label>
                <input 
                  type="number" 
                  step="0.1"
                  placeholder="0.0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold font-mono focus:outline-none focus:border-rose-300"
                  value={newTrade.slPips || ''}
                  onChange={e => setNewTrade({...newTrade, slPips: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Planned TP (Pips)</label>
                <input 
                  type="number" 
                  step="0.1"
                  placeholder="0.0"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold font-mono focus:outline-none focus:border-emerald-300"
                  value={newTrade.tpPips || ''}
                  onChange={e => setNewTrade({...newTrade, tpPips: Number(e.target.value)})}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Trade Notes & Logic</label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-100"
                rows={2}
                placeholder="Why did you take this trade? Any emotional cues?"
                value={newTrade.notes}
                onChange={e => setNewTrade({...newTrade, notes: e.target.value})}
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Screenshot URL (TradingView Link)</label>
              <div className="relative">
                <input 
                  type="url" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-5 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="https://www.tradingview.com/x/..."
                  value={newTrade.screenshotUrl}
                  onChange={e => setNewTrade({...newTrade, screenshotUrl: e.target.value})}
                />
                <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
              </div>
            </div>

          <button 
            type="submit"
            className="w-full bg-slate-900 text-white rounded-2xl py-4.5 font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 text-xs h-[56px]"
          >
            <Activity size={18} />
            Append to Log
          </button>
        </form>
      </Modal>

      {/* Strategy Entry Modal */}
      <Modal isOpen={isAddingStrategyMode} onClose={() => setIsAddingStrategyMode(false)} title="Configure Strategy">
        <form onSubmit={handleAddStrategy} className="space-y-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Strategy Designation</label>
            <input 
              type="text" 
              required
              placeholder="e.g. London Divergence"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-100"
              value={newStrategy.name}
              onChange={e => setNewStrategy({...newStrategy, name: e.target.value})}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Win Rate Target ($P$)</label>
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
               <input 
                type="range" 
                min="1" 
                max="99" 
                className="flex-1 accent-blue-600"
                value={newStrategy.targetWinRate}
                onChange={e => setNewStrategy({...newStrategy, targetWinRate: Number(e.target.value)})}
              />
              <span className="text-xl font-bold font-mono text-slate-900 w-12">{newStrategy.targetWinRate}%</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Design Logic (Notes)</label>
            <textarea 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-100"
              rows={3}
              placeholder="Brief description of strategy rules..."
              value={newStrategy.description}
              onChange={e => setNewStrategy({...newStrategy, description: e.target.value})}
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-blue-600 text-white rounded-2xl py-4.5 font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 text-xs h-[56px]"
          >
            <Target size={18} />
            Initialize Strategy
          </button>
        </form>
      </Modal>
    </div>
  );
}

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-10 overflow-hidden font-sans border border-white"
          >
            <div className="p-10">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
                <button onClick={onClose} className="text-slate-300 hover:text-slate-500 transition-colors">
                   <Trash2 size={24} className="rotate-45" />
                </button>
              </div>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function MetricBox({ icon, label, value, subValue, status }: { icon: React.ReactNode, label: string, value: string, subValue: string, status: 'good' | 'warning' | 'neutral' }) {
  const statusColors = {
    good: 'text-emerald-600',
    warning: 'text-amber-500',
    neutral: 'text-slate-400'
  };

  return (
    <div className="bg-white p-7 rounded-3xl border border-slate-200 shadow-sm font-sans flex flex-col justify-between h-full group hover:border-blue-100 transition-all">
      <div className="flex items-center gap-4 mb-4">
        <div className="bg-slate-50 p-2.5 rounded-xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-3xl font-black text-slate-900 tracking-tighter font-mono">{value}</span>
        <span className={`text-[10px] font-black uppercase mt-1.5 tracking-wider ${statusColors[status]}`}>{subValue}</span>
      </div>
    </div>
  );
}

// Helpers
const sessionColors = (session: string) => {
  switch (session) {
    case 'London': return 'bg-sky-50 text-sky-600 ring-1 ring-sky-100';
    case 'New York': return 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100';
    case 'Asia': return 'bg-amber-50 text-amber-600 ring-1 ring-amber-100';
    default: return 'bg-slate-50 text-slate-600';
  }
};

const processSessionData = (trades: Trade[]) => {
  const sessions: Record<string, { total: number, wins: number }> = {
    'London': { total: 0, wins: 0 },
    'New York': { total: 0, wins: 0 },
    'Asia': { total: 0, wins: 0 }
  };

  trades.forEach(t => {
    if (sessions[t.session]) {
      sessions[t.session].total++;
      if (t.result === 'Win') sessions[t.session].wins++;
    }
  });

  return Object.entries(sessions).map(([name, data]) => ({
    name: name.toUpperCase(),
    winRate: data.total ? (data.wins / data.total) * 100 : 0
  }));
};

const processDayData = (trades: Trade[]) => {
  const days: Record<string, number> = {};
  trades.forEach(t => {
    days[t.dayOfWeek] = (days[t.dayOfWeek] || 0) + t.pips;
  });

  return Object.entries(days)
    .sort((a, b) => b[1] - a[1])
    .map(([name, pips]) => ({ name: name.substring(0, 3).toUpperCase(), pips }));
}

