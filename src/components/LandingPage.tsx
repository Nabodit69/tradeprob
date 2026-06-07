import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  ShieldCheck, 
  TrendingUp, 
  ArrowRight, 
  Check, 
  BookOpen, 
  Users, 
  Percent, 
  DollarSign, 
  Calendar, 
  ChevronRight, 
  Menu, 
  X, 
  Award, 
  Lock, 
  Sparkles,
  Play,
  Mail,
  ChevronDown
} from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => void;
}

export default function LandingPage({ onSignIn }: LandingPageProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'plans' | 'blog' | 'affiliate'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Interactive Simulator State for HOME tab
  const [simWinRate, setSimWinRate] = useState<number>(65);
  const [simTrades, setSimTrades] = useState<number>(100);
  
  // Newsletter signup state
  const [emailInput, setEmailInput] = useState('');
  const [emailSubscribed, setEmailSubscribed] = useState(false);

  // Affiliate Waitlist state
  const [affiliateEmail, setAffiliateEmail] = useState('');
  const [affiliateJoined, setAffiliateJoined] = useState(false);

  const calculateConsecutiveStats = (rate: number) => {
    // Basic approximate math on probability of streaks of size n in consecutive independent trials
    const lossProb = (100 - rate) / 100;
    const winProb = rate / 100;
    
    // Formula for expected longest streak in N trials: ~ ln(N) / -ln(p)
    const expectedLongestLossStreak = Math.max(1, Math.round(Math.log(simTrades) / -Math.log(lossProb)));
    const expectedLongestWinStreak = Math.max(1, Math.round(Math.log(simTrades) / -Math.log(winProb)));
    
    return {
      lossStreak: expectedLongestLossStreak,
      winStreak: expectedLongestWinStreak,
      winProbSeries: (Math.pow(winProb, 5) * 100).toFixed(1), // Chance of 5 wins in a row
      lossProbSeries: (Math.pow(lossProb, 5) * 100).toFixed(1) // Chance of 5 losses in a row
    };
  };

  const simStats = calculateConsecutiveStats(simWinRate);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setEmailSubscribed(true);
      setTimeout(() => {
        setEmailInput('');
        setEmailSubscribed(false);
      }, 4000);
    }
  };

  const handleAffiliateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (affiliateEmail.trim()) {
      setAffiliateJoined(true);
      setTimeout(() => {
        setAffiliateEmail('');
        setAffiliateJoined(false);
      }, 4000);
    }
  };

  return (
    <div id="landing-page-root" className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white font-sans antialiased overflow-x-hidden flex flex-col justify-between">
      
      {/* Premium Elegant Navigation Bar */}
      <nav id="landing-nav" className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          {/* Logo */}
          <div 
            onClick={() => setActiveTab('home')} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Zap size={22} className="fill-white/10" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900">TradeProb</span>
              <span className="block text-[9px] text-blue-600 font-bold uppercase tracking-wider -mt-1">Statistical Advantage</span>
            </div>
          </div>

          {/* Center Navigation Links (Tabs) */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50">
            {(['home', 'plans', 'blog', 'affiliate'] as const).map((tab) => (
              <button
                key={tab}
                id={`nav-tab-${tab}`}
                onClick={() => {
                  setActiveTab(tab);
                  setMobileMenuOpen(false);
                }}
                className={`px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 ${
                  activeTab === tab 
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200/20' 
                    : 'text-slate-500 hover:text-slate-950'
                }`}
              >
                {tab === 'plans' ? 'Our Plans' : tab}
              </button>
            ))}
          </div>

          {/* Right CTA / Auth triggers */}
          <div className="hidden lg:flex items-center gap-4">
            <button
              id="nav-signin-btn"
              onClick={onSignIn}
              className="text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-blue-600 px-4 py-2 transition-colors"
            >
              Sign In
            </button>
            <button
              id="nav-getstarted-btn"
              onClick={onSignIn}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
            >
              Get Started
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Mobile Hamburguer Menu Trigger */}
          <button 
            id="mobile-menu-trigger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="lg:hidden p-2 text-slate-600 hover:text-blue-600 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Navigation Panel */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              id="mobile-nav-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-slate-100 mt-4 overflow-hidden"
            >
              <div className="flex flex-col gap-2 pt-2 pb-4">
                {(['home', 'plans', 'blog', 'affiliate'] as const).map((tab) => (
                  <button
                    key={tab}
                    id={`mobile-tab-${tab}`}
                    onClick={() => {
                      setActiveTab(tab);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm font-bold uppercase tracking-wider rounded-xl transition-all ${
                      activeTab === tab 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tab === 'plans' ? 'Our Plans' : tab}
                  </button>
                ))}
                <div className="h-px bg-slate-100 my-2" />
                <div className="flex gap-4 p-2">
                  <button
                    id="mobile-signin-btn"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onSignIn();
                    }}
                    className="flex-1 border border-slate-200 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Sign In
                  </button>
                  <button
                    id="mobile-getstarted-btn"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onSignIn();
                    }}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider font-sans hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5"
                  >
                    Get Started <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Tab Switcher Renders */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-8 md:py-16">
        <AnimatePresence mode="wait">
          
          {/* TAB: HOME */}
          {activeTab === 'home' && (
            <motion.div
              key="home-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-20 md:space-y-32"
            >
              
              {/* HERO SECTION */}
              <section id="hero-section" className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200/50 px-4 py-1.5 rounded-full text-blue-600 font-bold text-[11px] uppercase tracking-wider shadow-sm">
                    <Sparkles size={12} className="animate-pulse" />
                    <span>PROBABILITY-ENGINE V2.1 ACTIVE</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] !font-sans">
                    Trade with <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                      Mathematical Certainty.
                    </span>
                  </h1>
                  <p className="text-slate-600 text-base md:text-lg max-w-2xl mx-auto lg:mx-0 leading-relaxed font-sans">
                    Ditch emotional triggers. Track multiple trading strategy catalogs with a dynamic real-time probability matrix that isolates edge levels, streak models, and risk distributions.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                    <button
                      onClick={onSignIn}
                      className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-wider py-4 px-8 rounded-2xl shadow-xl shadow-slate-950/10 hover:shadow-slate-950/20 hover:-translate-y-0.5 transition-all text-sm flex items-center justify-center gap-3"
                    >
                      <span>Launch Your Portfolio</span>
                      <ArrowRight size={16} />
                    </button>
                    <button
                      onClick={() => setActiveTab('plans')}
                      className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold uppercase tracking-wider py-4 px-8 rounded-2xl transition-all text-sm flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Award size={16} className="text-blue-600" />
                      <span>View Pricing</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-center lg:justify-start gap-6 pt-6 text-slate-400 text-xs font-semibold uppercase tracking-wider border-t border-slate-200/60 max-w-lg">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck size={16} className="text-emerald-500" />
                      <span>Firebase Secure</span>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={16} className="text-emerald-500" />
                      <span>Zero-Lag Realtime</span>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    <div className="flex items-center gap-1.5">
                      <Zap size={16} className="text-blue-500" />
                      <span>Clean Design</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 relative">
                  {/* Visual UI Preview card */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-indigo-100 rounded-[2.5rem] filter blur-2xl opacity-70 -rotate-3 translate-x-2 translate-y-2 pointer-events-none" />
                  <div className="relative bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-2xl space-y-6">
                    <div className="flex justify-between items-center bg-slate-50 px-4 py-3.5 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Workspace simulator</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">Win Rate: {simWinRate}%</span>
                    </div>

                    <div className="space-y-4">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Adjust Edge Scenario</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold font-mono text-slate-700">
                          <span>Target Edge level</span>
                          <span>{simWinRate}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="30" 
                          max="90" 
                          value={simWinRate} 
                          onChange={(e) => setSimWinRate(Number(e.target.value))}
                          className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none" 
                        />
                      </div>

                      <div className="space-y-2 pt-1">
                        <div className="flex justify-between text-xs font-bold font-mono text-slate-700">
                          <span>Sample Series Size</span>
                          <span>{simTrades} Trades</span>
                        </div>
                        <div className="flex gap-2">
                          {[50, 100, 250].map((val) => (
                            <button
                              key={val}
                              onClick={() => setSimTrades(val)}
                              className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg border transition-all ${
                                simTrades === val 
                                  ? 'bg-blue-600 text-white border-blue-600' 
                                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {val} Trades
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-rose-500 mb-1">Max Loss Streak</p>
                        <p className="text-3xl font-black font-mono text-rose-600">{simStats.lossStreak}</p>
                        <p className="text-[10px] font-medium text-slate-400 mt-1">Expected consecutive losses</p>
                      </div>
                      <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1">Max Win Streak</p>
                        <p className="text-3xl font-black font-mono text-emerald-600">{simStats.winStreak}</p>
                        <p className="text-[10px] font-medium text-slate-400 mt-1">Expected consecutive wins</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-[11px] space-y-2">
                      <div className="flex justify-between text-slate-600 font-semibold">
                        <span>Chance of 5 wins in a row:</span>
                        <span className="font-mono font-bold text-emerald-600">{simStats.winProbSeries}%</span>
                      </div>
                      <div className="flex justify-between text-slate-600 font-semibold">
                        <span>Chance of 5 losses in a row:</span>
                        <span className="font-mono font-bold text-rose-600">{simStats.lossProbSeries}%</span>
                      </div>
                    </div>

                    <button 
                      onClick={onSignIn}
                      className="w-full bg-blue-600 hover:bg-blue-700 hover:scale-[1.02] active:scale-100 transition-all text-white py-4 px-6 rounded-2xl font-bold uppercase tracking-wider text-xs text-center shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                      <span>Unlock Real-Time Logging</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </section>

              {/* FEATURES CORE SECTION */}
              <section id="features-section" className="space-y-12">
                <div className="text-center max-w-3xl mx-auto space-y-4">
                  <p className="text-xs font-black uppercase tracking-widest text-blue-600">Built for Serious Disciplined Traders</p>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                    Gain a strict mathematical layout for your portfolio edge
                  </h2>
                  <p className="text-slate-500 leading-relaxed font-sans">
                    Stop trading randomly. Map setups, keep visual catalogs, and view probabilities live. Our algorithms process distribution curves derived from your actual database records.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* feat 1 */}
                  <div className="bg-white border border-slate-200 p-8 rounded-3xl space-y-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                      <TrendingUp size={22} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Setup Probability Models</h3>
                    <p className="text-slate-500 text-sm leading-relaxed font-sans">
                      Automatically calculate performance metrics across variables like Breakouts, Pullbacks, Range trades and mean reversion setups.
                    </p>
                  </div>
                  {/* feat 2 */}
                  <div className="bg-white border border-slate-200 p-8 rounded-3xl space-y-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                      <Award size={22} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Historical Streak Analysis</h3>
                    <p className="text-slate-500 text-sm leading-relaxed font-sans">
                      Predict and prepare for drawdowns. Determine whether a streak of consecutive losses is normal or a structural breakdown in your current setup system.
                    </p>
                  </div>
                  {/* feat 3 */}
                  <div className="bg-white border border-slate-200 p-8 rounded-3xl space-y-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                      <Lock size={22} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Instant Clean CSV Exports</h3>
                    <p className="text-slate-500 text-sm leading-relaxed font-sans">
                      Your trades are your assets. Download fully indexed CSV data with screenshots, stop loss values, takes profits, and emotional notes seamlessly on hover.
                    </p>
                  </div>
                </div>
              </section>

              {/* CALL TO ACTION ACCENT */}
              <section className="bg-slate-900 text-white rounded-[3rem] p-8 md:p-16 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500 rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none" />
                <div className="relative max-w-3xl space-y-6">
                  <span className="text-xs font-black tracking-widest text-blue-400 uppercase">Interactive dashboard ready</span>
                  <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                    Start tracking your trading edge under modern frameworks.
                  </h2>
                  <p className="text-slate-400 text-base md:text-lg leading-relaxed font-sans">
                    With zero complex configurations needed. Connect with your Google Account, define your customized catalog parameters, and let our mathematics isolate consistent pips generators.
                  </p>
                  <div className="pt-4">
                    <button
                      onClick={onSignIn}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider py-4 px-8 rounded-2xl transition-all text-sm flex items-center gap-2 shadow-xl shadow-blue-500/20"
                    >
                      <span>Get Started Right Now</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </section>

            </motion.div>
          )}

          {/* TAB: OUR PLANS */}
          {activeTab === 'plans' && (
            <motion.div
              key="plans-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-16"
            >
              <div className="text-center max-w-xl mx-auto space-y-4">
                <p className="text-xs font-black uppercase tracking-widest text-blue-600">SIMPLE TRANSPARENT PRICING</p>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Flexible plans for any trading scale</h1>
                <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                  Choose the subscription duration that fits your strategy testing goals. Cancel or extend anytime.
                </p>
              </div>

              {/* THREE PLANS CARD GRID */}
              <div id="pricing-matrix" className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                
                {/* PLAN 1: 1 Month */}
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 flex flex-col justify-between hover:shadow-xl transition-all duration-300 relative">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-600 px-3 py-1 rounded-full w-max block">Explorer tier</span>
                      <h3 className="text-2xl font-black text-slate-900">1 Month</h3>
                      <p className="text-slate-400 text-xs font-sans">Perfect for quick strategy testing & validation.</p>
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                      <p className="flex items-baseline font-mono text-slate-900">
                        <span className="text-4xl font-black">₹199</span>
                        <span className="text-slate-400 text-sm font-semibold ml-2">/ month</span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1 uppercase tracking-wider">billed monthly</p>
                    </div>

                    <ul className="space-y-4 border-t border-slate-100 pt-6 text-xs text-slate-600 font-semibold">
                      <li className="flex items-center gap-2">
                        <Check size={16} className="text-blue-600" />
                        <span>All core strategies calculators</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={16} className="text-blue-600" />
                        <span>Real-time streak distribution models</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={16} className="text-blue-600" />
                        <span>Interactive journal & trade logs</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={16} className="text-blue-600" />
                        <span>Export CSV & TradingView links</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={onSignIn}
                    className="w-full mt-8 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-wider py-4 rounded-2xl text-xs transition-colors"
                  >
                    Select Plan
                  </button>
                </div>

                {/* PLAN 2: 6 Months */}
                <div className="bg-white border-2 border-blue-600 rounded-[2.5rem] p-8 flex flex-col justify-between hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 relative shadow-xl shadow-blue-500/5">
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest shadow-md flex items-center gap-1.5">
                    <Sparkles size={10} className="fill-white" />
                    <span>Most Popular</span>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <span className="text-[10px] font-black uppercase bg-blue-50 text-blue-600 px-3 py-1 rounded-full w-max block">Ultimate commitment</span>
                      <h3 className="text-2xl font-black text-slate-900">6 Months</h3>
                      <p className="text-slate-400 text-xs font-sans">Ideal choice for systematic traders aiming for consistent edge.</p>
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                      <p className="flex items-baseline font-mono text-slate-900">
                        <span className="text-4xl font-black">₹149</span>
                        <span className="text-slate-400 text-sm font-semibold ml-2">/ month</span>
                      </p>
                      <p className="text-emerald-600 text-[10px] font-bold mt-1 uppercase tracking-wider flex items-center gap-1">
                        <span>Save 25%</span>
                        <span>•</span>
                        <span>₹894 (₹149 × 6) billed every 6 months</span>
                      </p>
                    </div>

                    <ul className="space-y-4 border-t border-slate-100 pt-6 text-xs text-slate-600 font-semibold">
                      <li className="flex items-center gap-2">
                        <Check size={16} className="text-blue-600" />
                        <span>Everything in 1-Month Plan</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={16} className="text-blue-600" />
                        <span>Priority server syncing speeds</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={16} className="text-blue-600" />
                        <span>Multiple concurrent strategy groups</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={16} className="text-blue-600" />
                        <span>Advanced probability distributions specs</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={onSignIn}
                    className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider py-4 rounded-2xl text-xs transition-colors shadow-lg shadow-blue-500/20"
                  >
                    Get Six Months Access
                  </button>
                </div>

                {/* PLAN 3: 12 Months */}
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 flex flex-col justify-between hover:shadow-xl transition-all duration-300 relative">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full w-max block">Best Value (Save 50%)</span>
                      <h3 className="text-2xl font-black text-slate-900">12 Months</h3>
                      <p className="text-slate-400 text-xs font-sans">For professional traders seeking a long-term compound strategy.</p>
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                      <p className="flex items-baseline font-mono text-slate-900">
                        <span className="text-4xl font-black">₹99</span>
                        <span className="text-slate-400 text-sm font-semibold ml-2">/ month</span>
                      </p>
                      <p className="text-emerald-600 text-[10px] font-bold mt-1 uppercase tracking-wider flex items-center gap-1">
                        <span>Save 50%</span>
                        <span>•</span>
                        <span>₹1,188 (₹99 × 12) billed every 12 months</span>
                      </p>
                    </div>

                    <ul className="space-y-4 border-t border-slate-100 pt-6 text-xs text-slate-600 font-semibold">
                      <li className="flex items-center gap-2">
                        <Check size={16} className="text-blue-600" />
                        <span>Everything in 6-Month Plan</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={16} className="text-blue-600" />
                        <span>Infinite historical strategy backtests</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={16} className="text-blue-600" />
                        <span>Premium dedicated developer logs</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check size={16} className="text-blue-600" />
                        <span>Lifetime feature updates access</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={onSignIn}
                    className="w-full mt-8 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-wider py-4 rounded-2xl text-xs transition-colors"
                  >
                    Select Plan
                  </button>
                </div>

              </div>

              {/* FAQ MINI SECTION */}
              <div className="max-w-3xl mx-auto border-t border-slate-200/80 pt-16 space-y-8">
                <h3 className="text-xl font-bold text-center text-slate-900">Frequently Asked Questions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                  <div className="space-y-2">
                    <p className="font-bold text-slate-900">How does the 6-month billing compute?</p>
                    <p className="text-slate-500 font-medium">It bills as a single semi-annual charge of ₹894 (₹149 × 6). This saves you 25% over the monthly explorer pricing rate.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-bold text-slate-900">Can I transfer strategies between plans?</p>
                    <p className="text-slate-500 font-medium">Yes, your entire data is backed up securely under your Google account credentials, regardless of plan changes.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-bold text-slate-900">Is stop-loss and take-profit math automated?</p>
                    <p className="text-slate-500 font-medium">Yes. The system parses your target parameters and alerts if actual performance diverges heavily from expectancy.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-bold text-slate-900">What is the money-back policy?</p>
                    <p className="text-slate-500 font-medium">We offer a full, no-questions-asked refund within 14 days of activation if you feel the statistics are not aiding your edge.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: BLOG */}
          {activeTab === 'blog' && (
            <motion.div
              key="blog-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-12"
            >
              <div className="text-center max-w-xl mx-auto space-y-4">
                <p className="text-xs font-black uppercase tracking-widest text-blue-600">COMING SOON</p>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">The TradeProb Blog</h1>
                <p className="text-slate-500 leading-relaxed font-sans">
                  Systematic trading advice, stop loss distribution curves, and the ultimate math guidebooks to beating emotional trade loops.
                </p>
              </div>

              {/* THREE MODEL POSTS WITH COMING SOON BLUR */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                
                {/* Coming Soon Overlay */}
                <div className="absolute inset-0 bg-slate-50/10 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center pointer-events-none" />
                
                {/* Post 1 */}
                <div className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-4 flex flex-col justify-between grayscale opacity-80 relative overflow-hidden">
                  <div className="absolute top-4 right-4 bg-blue-600 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-lg tracking-wider z-10">COMING SOON</div>
                  <div className="space-y-3">
                    <div className="flex gap-2 text-[10px] text-slate-400 font-black uppercase">
                      <span>Psychology</span>
                      <span>•</span>
                      <span>5 Min Read</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Beating the Drawdown Loop: Why Consecutives Occur</h3>
                    <p className="text-slate-500 text-xs leading-relaxed font-sans">
                      Understanding sample series error margins and why even 70% win-rate formulas experience consecutive losses.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400">
                    <span>By Dr. Sarah Vance</span>
                    <span>June 2026</span>
                  </div>
                </div>

                {/* Post 2 */}
                <div className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-4 flex flex-col justify-between grayscale opacity-80 relative overflow-hidden">
                  <div className="absolute top-4 right-4 bg-blue-600 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-lg tracking-wider z-10">COMING SOON</div>
                  <div className="space-y-3">
                    <div className="flex gap-2 text-[10px] text-slate-400 font-black uppercase">
                      <span>Mathematics</span>
                      <span>•</span>
                      <span>8 Min Read</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Risk Reward Ratio (R:R) vs. Realized Percent Expectancy</h3>
                    <p className="text-slate-500 text-xs leading-relaxed font-sans">
                      How setting strict stop losses parameters and target pips saves your account from total variance decay.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400">
                    <span>By Marcus Sterling</span>
                    <span>July 2026</span>
                  </div>
                </div>

                {/* Post 3 */}
                <div className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-4 flex flex-col justify-between grayscale opacity-80 relative overflow-hidden">
                  <div className="absolute top-4 right-4 bg-blue-600 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-lg tracking-wider z-10">COMING SOON</div>
                  <div className="space-y-3">
                    <div className="flex gap-2 text-[10px] text-slate-400 font-black uppercase">
                      <span>Log Keeping</span>
                      <span>•</span>
                      <span>4 Min Read</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">Why Taking Screenshots of TradingView is Non-Negotiable</h3>
                    <p className="text-slate-500 text-xs leading-relaxed font-sans">
                      Visual memory mapping strategies and emotional tracking that help you review previous trading models with clarity.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400">
                    <span>By Dr. Sarah Vance</span>
                    <span>Aug 24, 2026</span>
                  </div>
                </div>

              </div>

              {/* Newsletter subscription form */}
              <div className="max-w-xl mx-auto bg-white border border-slate-200 p-8 rounded-3xl text-center space-y-6 shadow-md shadow-slate-100/50">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <Mail size={20} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-lg">Subscribe to get notified major guidebooks publish</h3>
                  <p className="text-slate-500 text-xs font-sans">No spam. Only deep mathematical breakdowns and strategy spreadsheets.</p>
                </div>
                
                {emailSubscribed ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-50 text-emerald-700 border border-emerald-100 p-4 rounded-2xl text-xs font-bold uppercase tracking-wider"
                  >
                    🎉 Awesome! You are on the vip list. Stay tuned.
                  </motion.div>
                ) : (
                  <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="email" 
                      required
                      placeholder="Enter your trading email" 
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button 
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider text-xs px-6 py-3 rounded-xl transition-colors shrink-0"
                    >
                      Notify me
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB: AFFILIATE */}
          {activeTab === 'affiliate' && (
            <motion.div
              key="affiliate-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-12"
            >
              <div className="text-center max-w-xl mx-auto space-y-4">
                <p className="text-xs font-black uppercase tracking-widest text-blue-600">PARTNERSHIP ENGINES</p>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">TradeProb Affiliate Program</h1>
                <p className="text-slate-500 leading-relaxed">
                  Earn high recurring commissions by sharing TradeProb tools and dashboards with your trading audience, discord networks, and newsletter channels.
                </p>
              </div>

              {/* STATS HIGHLIGHT ROWS */}
              <div id="affiliate-perks" className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white border border-slate-200 p-6 rounded-2xl text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <Percent size={18} />
                  </div>
                  <h4 className="text-2xl font-black text-slate-900">30% Lifetime</h4>
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Recurring Commissions</p>
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-2xl text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <Calendar size={18} />
                  </div>
                  <h4 className="text-2xl font-black text-slate-900">60-Day</h4>
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Cookie Tracking Window</p>
                </div>

                <div className="bg-white border border-slate-200 p-6 rounded-2xl text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                    <DollarSign size={18} />
                  </div>
                  <h4 className="text-2xl font-black text-slate-900">Fast Monthly</h4>
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Payouts via USDT/Bank</p>
                </div>
              </div>

              <div id="affiliate-details" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white border border-slate-200 p-8 rounded-[2.5rem]">
                <div className="lg:col-span-7 space-y-6">
                  <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-3 py-1 rounded-full w-max block">Program Status: Coming Soon</span>
                  <h3 className="text-2xl font-black text-slate-900">Maximize passive profit curves by helping traders refine their expectancy levels.</h3>
                  <p className="text-slate-500 text-sm leading-relaxed font-sans">
                    When the affiliate engine launches soon, you will receive a customizable link tracking cookie records instantly. We provide high-converting marketing content, direct backtest graphs, and landing page scripts to embed directly.
                  </p>
                  
                  <div className="space-y-3 font-semibold text-xs text-slate-700">
                    <p className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-500" />
                      <span>Dedicated partnership review panel</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-500" />
                      <span>Elite resource bundlepacks with strategy guides</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-500" />
                      <span>Personal VIP manager for referrals above 50 accounts</span>
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-6 rounded-3xl space-y-6">
                  <div className="space-y-2 text-center lg:text-left">
                    <h4 className="font-bold text-slate-900">Join the Affiliate waitlist</h4>
                    <p className="text-slate-500 text-xs font-sans">Get priority approval and 35% starting rates instead of 30%.</p>
                  </div>

                  {affiliateJoined ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-emerald-50 text-emerald-700 border border-emerald-100 p-4 rounded-2xl text-xs font-bold text-center uppercase tracking-wider"
                    >
                      🚀 Joined successfully! Welcome aboard.
                    </motion.div>
                  ) : (
                    <form onSubmit={handleAffiliateSubmit} className="space-y-3">
                      <input 
                        type="email" 
                        required
                        placeholder="Enter your partnership email" 
                        value={affiliateEmail}
                        onChange={(e) => setAffiliateEmail(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      />
                      <button 
                        type="submit"
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-wider text-xs py-3.5 rounded-xl transition-all shadow-md"
                      >
                        Secure Early Partner Rate
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer id="landing-footer" className="bg-white border-t border-slate-200 px-6 py-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600/10 p-1.5 rounded-lg text-blue-600">
              <Zap size={16} />
            </div>
            <span className="text-slate-900 font-bold text-sm">TradeProb © 2026</span>
          </div>
          <p className="text-slate-400 text-xs font-sans max-w-md">
            Trading derivatives carries substantial risk. All values derived from simulations represent statistical likelihoods and are for analytical assistance only.
          </p>
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-slate-400">
            <button onClick={() => setActiveTab('home')} className="hover:text-blue-600">Homepage</button>
            <button onClick={() => setActiveTab('plans')} className="hover:text-blue-600">Plans</button>
            <button onClick={() => setActiveTab('blog')} className="hover:text-blue-600">Blog</button>
            <button onClick={() => setActiveTab('affiliate')} className="hover:text-blue-600">Affiliates</button>
          </div>
        </div>
      </footer>

    </div>
  );
}
