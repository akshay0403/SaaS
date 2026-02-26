import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Loader2, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  MessageSquare, 
  DollarSign, 
  Zap,
  ExternalLink,
  ArrowRight,
  Info,
  User,
  LogOut,
  Lock,
  Mail
} from 'lucide-react';
import { ResearchStage, ResearchPlan, SignalReport, ProblemPattern, UserProfile } from './types';
import { generateResearchPlan, executeResearch, analyzeSignals } from './services/geminiService';
import { supabase, getProfile, incrementCredits } from './services/supabase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [market, setMarket] = useState('');
  const [stage, setStage] = useState<ResearchStage>(ResearchStage.IDLE);
  const [plan, setPlan] = useState<ResearchPlan | null>(null);
  const [report, setReport] = useState<SignalReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressText, setProgressText] = useState('');
  
  // Auth State
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFirstName, setAuthFirstName] = useState('');
  const [authLastName, setAuthLastName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Config check
  const configStatus = {
    gemini: !!process.env.GEMINI_API_KEY,
    supabaseUrl: !!process.env.VITE_SUPABASE_URL,
    supabaseKey: !!process.env.VITE_SUPABASE_ANON_KEY
  };
  const isConfigured = configStatus.gemini && configStatus.supabaseUrl && configStatus.supabaseKey;

  useEffect(() => {
    if (!isConfigured) {
      console.error("Configuration missing:", configStatus);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, [isConfigured]);

  const fetchProfile = async (userId: string) => {
    const p = await getProfile(userId);
    setProfile(p);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError(null);

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: {
              first_name: authFirstName,
              last_name: authLastName,
            }
          }
        });
        if (error) throw error;
        if (data.user) {
          alert('Check your email for the confirmation link!');
          setShowAuthModal(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        setShowAuthModal(false);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const startResearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!market.trim()) return;

    if (!session) {
      setShowAuthModal(true);
      return;
    }

    if (profile && !profile.is_pro && profile.credits_used >= 3) {
      setError('Free credit limit reached. Please upgrade to Pro.');
      return;
    }

    setStage(ResearchStage.PLANNING);
    setError(null);
    setPlan(null);
    setReport(null);
    setProgressText('Planning your research strategy...');

    try {
      // Stage 1: Planning
      const researchPlan = await generateResearchPlan(market);
      setPlan(researchPlan);
      
      // Stage 2: Researching
      setStage(ResearchStage.RESEARCHING);
      setProgressText(`Scanning ${researchPlan.subreddits.length} subreddits and ${researchPlan.softwareCategories.length} software categories...`);
      const rawData = await executeResearch(market, researchPlan);
      
      // Stage 3: Analyzing
      setStage(ResearchStage.ANALYZING);
      setProgressText('Analyzing signals and extracting problem patterns...');
      const finalReport = await analyzeSignals(market, rawData);
      
      setReport(finalReport);
      setStage(ResearchStage.COMPLETED);

      // Increment credits
      if (session) {
        await incrementCredits(session.user.id);
        fetchProfile(session.user.id);
      }
    } catch (err: any) {
      console.error("Research Error Details:", {
        message: err.message,
        stack: err.stack,
        error: err
      });
      setError(err.message || 'An unexpected error occurred during research.');
      setStage(ResearchStage.ERROR);
    }
  };

  useEffect(() => {
    if (stage === ResearchStage.COMPLETED && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [stage]);

  const renderScore = (label: string, score: number, icon: React.ReactNode) => (
    <div className="flex items-center gap-2">
      <div className="text-zinc-500">{icon}</div>
      <div className="flex-1">
        <div className="flex justify-between text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">
          <span>{label}</span>
          <span>{score}/5</span>
        </div>
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(score / 5) * 100}%` }}
            className={cn(
              "h-full rounded-full",
              score >= 4 ? "bg-emerald-500" : score >= 3 ? "bg-amber-500" : "bg-zinc-600"
            )}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <nav className="border-b border-zinc-900/50 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-black fill-current" />
            </div>
            <span className="font-bold text-xl tracking-tight">PainPoint</span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
              <a href="#" className="hover:text-white transition-colors">How it works</a>
              {profile && (
                <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded-full border border-zinc-800">
                  <span className="text-zinc-500">Credits:</span>
                  <span className="text-emerald-500 font-bold">{profile.is_pro ? 'Unlimited' : `${3 - profile.credits_used} left`}</span>
                </div>
              )}
            </div>
            
            {session ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="hidden sm:inline">{profile?.first_name || session.user.email}</span>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="p-2 text-zinc-500 hover:text-white transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 bg-zinc-900 text-white rounded-full border border-zinc-800 hover:bg-zinc-800 transition-all text-sm font-medium"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12 md:py-24">
        {!isConfigured && (
          <div className="mb-12 p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-bold text-amber-500">Configuration Required</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                The following API keys are missing from your Secrets:
              </p>
              <ul className="text-xs space-y-1">
                {!configStatus.gemini && <li className="text-amber-200">• GEMINI_API_KEY</li>}
                {!configStatus.supabaseUrl && <li className="text-amber-200">• VITE_SUPABASE_URL</li>}
                {!configStatus.supabaseKey && <li className="text-amber-200">• VITE_SUPABASE_ANON_KEY</li>}
              </ul>
              <p className="text-xs text-zinc-500 pt-2">
                Please add them to the <strong>Secrets</strong> panel in the sidebar and restart the app.
              </p>
            </div>
          </div>
        )}

        {/* Hero / Input Section */}
        <AnimatePresence mode="wait">
          {stage === ResearchStage.IDLE || stage === ResearchStage.ERROR ? (
            <motion.div 
              key="hero"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-3xl mx-auto text-center space-y-8"
            >
              <div className="space-y-4">
                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
                  Find the problems worth solving.
                </h1>
                <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                  Stop guessing. We scan Reddit, G2, and niche forums to find validated market pain points for your next venture.
                </p>
              </div>

              <form onSubmit={startResearch} className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-2xl p-2 shadow-2xl">
                  <div className="pl-4 text-zinc-500">
                    <Search className="w-6 h-6" />
                  </div>
                  <input 
                    type="text" 
                    value={market}
                    onChange={(e) => setMarket(e.target.value)}
                    placeholder="Describe a market (e.g. gym owners, freelance video editors)..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-lg px-4 py-3 placeholder:text-zinc-600"
                  />
                  <button 
                    type="submit"
                    disabled={!market.trim()}
                    className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-black font-bold px-8 py-3 rounded-xl transition-all flex items-center gap-2"
                  >
                    Research <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {error && (
                <div className="flex items-center gap-2 text-red-400 justify-center bg-red-400/10 py-3 px-4 rounded-xl border border-red-400/20">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-3 pt-4">
                {['Gym Owners', 'SaaS Founders', 'E-commerce', 'Video Editors'].map((tag) => (
                  <button 
                    key={tag}
                    onClick={() => setMarket(tag)}
                    className="px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-all"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : stage !== ResearchStage.COMPLETED ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-xl mx-auto text-center space-y-12 py-24"
            >
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
                </div>
                <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mx-auto relative z-10" />
              </div>
              
              <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">{progressText}</h2>
                <div className="flex justify-center gap-2">
                  {[
                    ResearchStage.PLANNING, 
                    ResearchStage.RESEARCHING, 
                    ResearchStage.ANALYZING
                  ].map((s, i) => (
                    <div 
                      key={s}
                      className={cn(
                        "h-1.5 w-12 rounded-full transition-all duration-500",
                        stage === s ? "bg-emerald-500 w-24" : i < [ResearchStage.PLANNING, ResearchStage.RESEARCHING, ResearchStage.ANALYZING].indexOf(stage) ? "bg-emerald-900" : "bg-zinc-800"
                      )}
                    />
                  ))}
                </div>
              </div>

              {plan && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 text-left space-y-4"
                >
                  <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm uppercase tracking-widest">
                    <Info className="w-4 h-4" />
                    Research Strategy
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="text-zinc-500">Subreddits</div>
                      <div className="font-medium">{plan.subreddits.map(s => s.name).join(', ')}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-zinc-500">Platforms</div>
                      <div className="font-medium">{plan.softwareCategories.join(', ')}</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Report Section */}
        {stage === ResearchStage.COMPLETED && report && (
          <motion.div 
            ref={scrollRef}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-16"
          >
            {/* Executive Summary */}
            <div className="space-y-6 max-w-4xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold uppercase tracking-widest">
                <CheckCircle2 className="w-4 h-4" />
                Research Complete
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                Signal Report: <span className="text-zinc-500">{market}</span>
              </h2>
              <p className="text-xl text-zinc-400 leading-relaxed border-l-2 border-emerald-500/30 pl-6 py-2">
                {report.executiveSummary}
              </p>
            </div>

            {/* Signal Matrix */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">Problem Signal Matrix</h3>
                <div className="flex gap-4 text-xs font-medium text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    Strong Signal
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    Weak Signal
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {report.patterns.map((pattern) => (
                  <motion.div 
                    key={pattern.id}
                    whileHover={{ y: -4 }}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-6 group transition-all hover:border-zinc-700 hover:shadow-2xl hover:shadow-emerald-500/5"
                  >
                    <div className="flex justify-between items-start">
                      <div className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                        pattern.classification === 'Strong Signal' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                      )}>
                        {pattern.classification}
                      </div>
                      <div className="text-zinc-700 group-hover:text-zinc-500 transition-colors">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-lg font-bold leading-tight">{pattern.title}</h4>
                      <p className="text-sm text-zinc-400 line-clamp-2">{pattern.description}</p>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                      {renderScore('Frequency', pattern.scores.frequency, <MessageSquare className="w-3 h-3" />)}
                      {renderScore('Desperation', pattern.scores.desperation, <TrendingUp className="w-3 h-3" />)}
                      {renderScore('Willingness to Pay', pattern.scores.willingnessToPay, <DollarSign className="w-3 h-3" />)}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Detailed Evidence */}
            <div className="space-y-12">
              <h3 className="text-3xl font-bold">Evidence & Insights</h3>
              <div className="space-y-24">
                {report.patterns.map((pattern) => (
                  <div key={pattern.id} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-4 space-y-4 sticky top-24 h-fit">
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Pattern Detail</div>
                        <h4 className="text-2xl font-bold">{pattern.title}</h4>
                      </div>
                      <p className="text-zinc-400 leading-relaxed">{pattern.description}</p>
                      
                      <div className="pt-6 grid grid-cols-2 gap-4">
                        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
                          <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Frequency</div>
                          <div className="text-xl font-bold">{pattern.scores.frequency}/5</div>
                        </div>
                        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
                          <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Desperation</div>
                          <div className="text-xl font-bold">{pattern.scores.desperation}/5</div>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-8 space-y-6">
                      {pattern.quotes.map((quote, idx) => (
                        <div key={idx} className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-8 space-y-6 hover:bg-zinc-900/50 transition-all">
                          <blockquote className="text-xl font-medium text-zinc-200 italic leading-relaxed">
                            "{quote.text}"
                          </blockquote>
                          <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                                {quote.source.charAt(0)}
                              </div>
                              <div className="text-sm">
                                <div className="font-bold text-zinc-300">{quote.source}</div>
                                <div className="text-zinc-500 text-xs">{quote.date}</div>
                              </div>
                            </div>
                            <a 
                              href={quote.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors"
                            >
                              View Source <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-12 space-y-8">
              <div className="space-y-2">
                <h3 className="text-3xl font-bold">Where to dig deeper</h3>
                <p className="text-zinc-400">Recommended follow-up research based on these findings.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {report.nextSteps.map((step, idx) => (
                  <div key={idx} className="flex gap-4 bg-black/40 p-6 rounded-2xl border border-zinc-800/50">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <p className="text-zinc-300 font-medium leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Action */}
            <div className="text-center py-24 space-y-8">
              <h2 className="text-3xl font-bold">Ready to research another market?</h2>
              <button 
                onClick={() => {
                  setStage(ResearchStage.IDLE);
                  setMarket('');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-8 py-4 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-all flex items-center gap-2 mx-auto"
              >
                Start New Research <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </main>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl"
            >
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold">{authMode === 'signin' ? 'Welcome Back' : 'Create Account'}</h3>
                  <p className="text-zinc-500 text-sm">
                    {authMode === 'signin' ? 'Sign in to continue your research' : 'Join PainPoint to start finding market gaps'}
                  </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                  {authMode === 'signup' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">First Name</label>
                        <input 
                          type="text"
                          required
                          value={authFirstName}
                          onChange={(e) => setAuthFirstName(e.target.value)}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Last Name</label>
                        <input 
                          type="text"
                          required
                          value={authLastName}
                          onChange={(e) => setAuthLastName(e.target.value)}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input 
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                        placeholder="name@example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input 
                        type="password"
                        required
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="text-red-400 text-xs font-medium bg-red-400/10 p-3 rounded-lg border border-red-400/20 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
                  </button>
                </form>

                <div className="text-center">
                  <button 
                    onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                    className="text-sm text-zinc-500 hover:text-emerald-500 transition-colors"
                  >
                    {authMode === 'signin' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 opacity-50">
            <Zap className="w-5 h-5 text-emerald-500 fill-current" />
            <span className="font-bold text-lg tracking-tight">PainPoint</span>
          </div>
          <div className="text-zinc-500 text-sm">
            © 2026 PainPoint Research. Built for entrepreneurs.
          </div>
          <div className="flex gap-6 text-zinc-500 text-sm font-medium">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
