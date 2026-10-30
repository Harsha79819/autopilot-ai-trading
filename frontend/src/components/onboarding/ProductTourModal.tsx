import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  TrendingUp,
  BrainCircuit,
  Mic,
  FileSpreadsheet,
  LineChart,
  PieChart,
  Settings,
  ShieldCheck,
  CheckCircle2,
  Compass,
  ArrowRight
} from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

interface ProductTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVoice?: () => void;
  onOpenChat?: () => void;
}

interface TourStep {
  id: string;
  tabTarget: string;
  badge: string;
  titleEn: string;
  titleTe: string;
  descEn: string;
  descTe: string;
  icon: React.ElementType;
  iconColor: string;
  locationEn: string;
  locationTe: string;
  highlightsEn: string[];
  highlightsTe: string[];
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    tabTarget: 'dashboard',
    badge: 'Step 1 of 8 • Welcome',
    titleEn: 'Welcome to AutoPilot AI Platform',
    titleTe: 'AutoPilot AI ప్లాట్‌ఫామ్‌కు స్వాగతం!',
    descEn: 'Your personal AI Financial Adviser, Nifty 50 Paper Trading Simulator, and Wealth Intelligence Engine. Zero financial risk, real-time analytics, and bilingual voice interaction.',
    descTe: 'మీ వ్యక్తిగత AI ఫైనాన్షియల్ అడ్వైజర్, నిఫ్టీ 50 పేపర్ ట్రేడింగ్ సిమ్యులేటర్ మరియు సంపద ప్రణాళిక వేదిక. ఎటువంటి ఆర్థిక నష్ట భయం లేకుండా నిజమైన మార్కెట్ ట్రేడింగ్ నేర్చుకోండి.',
    icon: Compass,
    iconColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    locationEn: 'Platform Overview & Getting Started',
    locationTe: 'ప్లాట్‌ఫామ్ పరిచయం & ప్రారంభ గైడ్',
    highlightsEn: [
      '₹5,000.00 Starting Virtual Cash',
      'Strict Paper Trading (100% Risk-Free)',
      '1:2 Risk-Reward (SL -1.5%, TP +3.0%)',
      'Bilingual Support (Telugu & English)'
    ],
    highlightsTe: [
      '₹5,000.00 వర్చువల్ స్టార్టింగ్ క్యాపిటల్',
      '100% సేఫ్ పేపర్ ట్రేడింగ్ (రిస్క్-ఫ్రీ)',
      '1:2 రిస్క్-రివార్డ్ (-1.5% SL, +3.0% TP)',
      'తెలుగు & ఇంగ్లీష్ ద్విభాషా సదుపాయం'
    ]
  },
  {
    id: 'dashboard',
    tabTarget: 'dashboard',
    badge: 'Step 2 of 8 • Dashboard',
    titleEn: 'Live Dashboard & Portfolio Balance',
    titleTe: 'లైవ్ డాష్‌బోర్డ్ & పోర్ట్‌ఫోలియో బ్యాలెన్స్',
    descEn: 'Track your real-time virtual cash (₹5,000), portfolio value, win-rate %, open positions, and live Nifty 50 market breadth at a glance.',
    descTe: 'ఇక్కడ మీ వర్చువల్ నిధులు (₹5,000.00), ఓపెన్ పొజిషన్లు, విన్-రేట్ %, మరియు నిఫ్టీ 50 లైవ్ మార్కెట్ ట్రెండ్స్ ఒకే చోట సులభంగా పర్యవేక్షించవచ్చు.',
    icon: TrendingUp,
    iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    locationEn: 'Top Navigation -> Overview Tab',
    locationTe: 'పైన ఉన్న మెనూలో "Overview" ట్యాబ్',
    highlightsEn: [
      'Hero Portfolio Card (Cash & Equity)',
      'Quick Action Cards: Invest, Portfolio, Withdraw',
      'Open Positions & Scanner Grid',
      'Real-Time Orders & Audit History'
    ],
    highlightsTe: [
      'హీరో పోర్ట్‌ఫోలియో కార్డ్ (క్యాష్ & ఈక్విటీ)',
      'Invest, Portfolio, Withdraw క్విక్ కార్డ్స్',
      'ఓపెన్ పొజిషన్లు & మార్కెట్ స్కానర్',
      'రియల్-టైమ్ ఆర్డర్స్ & ఆడిట్ హిస్టరీ'
    ]
  },
  {
    id: 'voice',
    tabTarget: 'dashboard',
    badge: 'Step 3 of 8 • Voice AI',
    titleEn: 'Conversational Voice Copilot ("Hey Darling")',
    titleTe: 'వాయిస్ కోపైలట్ ("Hey Darling" & ఫిమేల్ వాయిస్)',
    descEn: 'Speak naturally to your financial adviser just like ChatGPT. Say "Hey Darling" or tap the floating microphone. Listens attentively with smart pause detection and responds in a fluent female voice.',
    descTe: 'ChatGPT తరహాలో నేరుగా మాట్లాడండి! స్క్రీన్ కుడివైపు కింద ఉన్న మైక్ బటన్ నొక్కి లేదా "Hey Darling" అని పలకడం ద్వారా ఫిమేల్ వాయిస్‌తో తెలుగు మరియు ఇంగ్లీష్‌లో వేగంగా సమాధానం పొందవచ్చు.',
    icon: Mic,
    iconColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    locationEn: 'Floating Microphone (Bottom-Right) & Header Mic',
    locationTe: 'కుడివైపు కింద ఉన్న మైక్ & టాప్ హెడర్ మైక్రోఫోన్',
    highlightsEn: [
      'Hands-Free "Hey Darling" Wake Word',
      'Smart 1.8s Silence Detection (No mid-sentence cutoffs)',
      'Natural High-Pitched Female Voice (Telugu & English)',
      'Animated Glowing Orb Visualizer'
    ],
    highlightsTe: [
      '"Hey Darling" హ్యాండ్స్-ఫ్రీ యాక్టివేషన్',
      'స్మార్ట్ సైలెన్స్ డిటెక్షన్ (పూర్తి మాటలు వింటుంది)',
      'సహజమైన ఫిమేల్ వాయిస్ సింథసిస్',
      'గ్లోయింగ్ వాయిస్ ఆర్బ్ యానిమేషన్'
    ]
  },
  {
    id: 'ai-adviser',
    tabTarget: 'ai-adviser',
    badge: 'Step 4 of 8 • AI Adviser',
    titleEn: 'AI Financial Adviser & Error Diagnostics',
    titleTe: 'AI ఫైనాన్షియల్ అడ్వైజర్ & ఎర్రర్ విశ్లేషణ',
    descEn: 'Ask complex financial queries, stock suggestions for your ₹5,000 cash, or why any past trade was blocked. The AI inspects historical database audit logs to explain root causes.',
    descTe: 'స్టాక్ మార్కెట్ సందేహాలు, ₹5,000 తో ఏ షేర్లు కొనాలి, లేదా గతంలో ఏదైనా ఆర్డర్ ఎందుకు ఆగిందో (Error Diagnosis) డేటాబేస్ నుండి వెలికితీసి క్షణాల్లో విశ్లేషిస్తుంది.',
    icon: BrainCircuit,
    iconColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    locationEn: 'Top Navigation -> "AI Adviser" Tab or Floating Chat Button',
    locationTe: 'మెనూలోని "AI Adviser" లేదా కుడివైపు చాట్ బటన్',
    highlightsEn: [
      'Sub-15ms Ultra-Fast Quantitative Intelligence',
      'Historical Audit Log Error Diagnostic Hunter',
      'Large-Cap Whole-Share Recommendations',
      'Dual Interface: Full View & Quick Floating Modal'
    ],
    highlightsTe: [
      '15ms లోపే సూపర్ ఫాస్ట్ రెస్పాన్స్',
      'డేటాబేస్ ఆడిట్ లాగ్ ఎర్రర్ డయాగ్నోస్టిక్స్',
      'లార్జ్ క్యాప్ పూర్తి షేర్ల కొనుగోలు సలహాలు',
      'ఫుల్ పేజీ & క్విక్ మోడల్ రెండు సదుపాయాలు'
    ]
  },
  {
    id: 'reports',
    tabTarget: 'reports',
    badge: 'Step 5 of 8 • Excel Ledger',
    titleEn: '📅 Day-to-Day Excel Ledger & CSV Export',
    titleTe: '📅 డే-టు-డే ఎక్సెల్ లెడ్జర్ & డౌన్‌లోడ్ (.csv)',
    descEn: 'Chronological day-by-day record from Day 1 (2026-10-19) to present and all future days. Track opening capital, trades, taxes, net PnL, closing capital, and AI decisions with 1-click Excel download.',
    descTe: 'Day 1 నుండి నేటి వరకు మరియు భవిష్యత్తు రోజులకు సంబంధించిన ప్రతి రోజు లెక్కలు, ట్రేడ్లు, ఖర్చులు, నికర లాభనష్టాలు మరియు AI నిర్ణయాలు ఒకే ఎక్సెల్ షీట్‌లో చూడవచ్చు మరియు .csv గా డౌన్‌లోడ్ చేసుకోవచ్చు.',
    icon: FileSpreadsheet,
    iconColor: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    locationEn: 'Top Navigation -> Tools Dropdown -> "Reports"',
    locationTe: 'టాప్ మెనూ లోని Tools -> "Reports" ట్యాబ్',
    highlightsEn: [
      'Day 1 to Future Dynamic Tracking',
      'Modeled Indian Statutory Taxes (STT, GST, SEBI)',
      '1-Click "Download Excel Sheet (.csv)" with UTF-8 BOM',
      'Plain-Language AI Strategy Summaries for Every Day'
    ],
    highlightsTe: [
      'Day 1 నుండి భవిష్యత్తు వరకు రోజువారీ ట్రాకింగ్',
      'భారతీయ పన్నుల లెక్కలు (STT, GST, SEBI ఫీజులు)',
      '1-క్లిక్ ఎక్సెల్ షీట్ (.csv) డౌన్‌లోడ్ సదుపాయం',
      'ప్రతి రోజుకు సులభంగా అర్థమయ్యే వివరణ'
    ]
  },
  {
    id: 'orders',
    tabTarget: 'orders',
    badge: 'Step 6 of 8 • Paper Trading',
    titleEn: 'Strict Paper Trading & 1:2 Risk-Reward',
    titleTe: 'క్రమశిక్షణతో కూడిన పేపర్ ట్రేడింగ్ (1:2 RR)',
    descEn: 'Execute zero-risk paper orders on Nifty 50 equities. Every order enforces -1.5% stop loss and +3.0% take profit targets with Van Tharp 1.5% position risk limits.',
    descTe: 'నిఫ్టీ 50 షేర్లలో పూర్తి రిస్క్-ఫ్రీ పేపర్ ట్రేడింగ్ చేయండి. ప్రతి ఆర్డర్‌లోనూ -1.5% స్టాప్ లాస్ మరియు +3.0% టేక్ ప్రాఫిట్ నిబంధన అమలు చేయబడి మీ మూలధనాన్ని కాపాడుతుంది.',
    icon: LineChart,
    iconColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    locationEn: 'Top Navigation -> "Paper Trading" Tab',
    locationTe: 'మెనూ లోని "Paper Trading" ట్యాబ్',
    highlightsEn: [
      'Whole-Share Affordability Enforcement',
      'Automatic Stop-Loss & Take-Profit Targets',
      'Transparent Execution Cost-Gate',
      '2% Daily Loss Circuit Breaker'
    ],
    highlightsTe: [
      'పూర్తి షేర్ల కొనుగోలు నిబంధన',
      'ఆటోమేటిక్ స్టాప్ లాస్ & టార్గెట్ ప్రొటెక్షన్',
      'లావాదేవీ ఫీజుల కాలిక్యులేషన్',
      '2% డైలీ లాస్ సర్క్యూట్ బ్రేకర్'
    ]
  },
  {
    id: 'planner',
    tabTarget: 'planner',
    badge: 'Step 7 of 8 • Wealth Planner',
    titleEn: 'Deterministic Wealth Planner & Calculators',
    titleTe: 'ఆర్థిక ప్రణాళికలు & ఫైనాన్షియల్ కాలిక్యులేటర్లు',
    descEn: 'Plan long-term wealth with closed-form mathematical equations: Inflation-adjusted SIP, Home & Car Loan EMI, Emergency Fund sizing (6 months), and Retirement Corpus.',
    descTe: 'ద్రవ్యోల్బణాన్ని లెక్కించే SIP కాలిక్యులేటర్, హోమ్ & కార్ లోన్ EMI, 6 నెలల ఎమర్జెన్సీ ఫండ్, మరియు రిటైర్మెంట్ కార్పస్ ఖచ్చితమైన గణిత సూత్రాలతో లెక్కించండి.',
    icon: PieChart,
    iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    locationEn: 'Top Navigation -> "Planner" Tab',
    locationTe: 'మెనూ లోని "Planner" ట్యాబ్',
    highlightsEn: [
      'SIP Future Value (Nominal & Inflation-Adjusted)',
      'Loan EMI Calculator with Interest vs Principal Split',
      'Emergency Fund & Savings Goal Trackers',
      'Zero LLM Hallucinations (Strict Math Formulas)'
    ],
    highlightsTe: [
      'ద్రవ్యోల్బణం పరిగణించిన SIP సంపద లెక్కింపు',
      'వడ్డీ & అసలు విభజనతో లోన్ EMI కాలిక్యులేటర్',
      'ఎమర్జెన్సీ ఫండ్ & సేవింగ్స్ గోల్ ప్లానర్',
      '100% ఖచ్చితమైన గణిత ఫార్ములాలు'
    ]
  },
  {
    id: 'settings',
    tabTarget: 'settings',
    badge: 'Step 8 of 8 • Settings & Gemini AI',
    titleEn: 'Settings & Optional Google Gemini AI',
    titleTe: 'సెట్టింగ్స్ & Google Gemini API కనెక్షన్',
    descEn: 'Toggle language (English / Telugu), reset your simulated capital anytime, and optionally plug in your free Google Gemini API key for conversational AI chat.',
    descTe: 'తెలుగు లేదా ఇంగ్లీష్ భాషను ఎంచుకోవచ్చు, వర్చువల్ క్యాపిటల్‌ను రీసెట్ చేయవచ్చు, మరియు పూర్తి ఫ్లూయెంట్ సంభాషణల కోసం మీ వ్యక్తిగత Google Gemini API Key ను కనెక్ట్ చేసుకోవచ్చు.',
    icon: Settings,
    iconColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    locationEn: 'Top Navigation -> Tools Dropdown -> "Settings"',
    locationTe: 'టాప్ మెనూ లోని Tools -> "Settings" ట్యాబ్',
    highlightsEn: [
      'Telugu (తెలుగు) & English Bilingual Toggle',
      'Google Gemini 1.5/2.0 API Key Integration',
      '1-Click "Test AI Connection" Verification',
      'Reset Virtual Capital to ₹5,000.00'
    ],
    highlightsTe: [
      'తెలుగు & ఇంగ్లీష్ లాంగ్వేజ్ స్విచ్',
      'Google Gemini AI API కీ సదుపాయం',
      '1-క్లిక్ "Test AI" కనెక్షన్ వెరిఫికేషన్',
      'వర్చువల్ క్యాపిటల్ ₹5,000 కు రీసెట్ ఆప్షన్'
    ]
  }
];

export const ProductTourModal: React.FC<ProductTourModalProps> = ({
  isOpen,
  onClose,
  onOpenVoice,
  onOpenChat
}) => {
  const { setActiveTab } = useTrading();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  const currentStep = TOUR_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  // Auto-switch tabs to show the feature in real life!
  useEffect(() => {
    if (isOpen && currentStep) {
      setActiveTab(currentStep.tabTarget);
    }
  }, [isOpen, currentStepIndex, currentStep, setActiveTab]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (!isLastStep) {
          setCurrentStepIndex((prev) => Math.min(prev + 1, TOUR_STEPS.length - 1));
        } else {
          handleFinish();
        }
      } else if (e.key === 'ArrowLeft') {
        if (!isFirstStep) {
          setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
        }
      } else if (e.key === 'Escape') {
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, isLastStep, isFirstStep]);

  const handleNext = () => {
    if (!isLastStep) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    if (dontShowAgain) {
      localStorage.setItem('autopilot_tour_completed', 'true');
    }
    onClose();
  };

  const handleFinish = () => {
    if (dontShowAgain) {
      localStorage.setItem('autopilot_tour_completed', 'true');
    }
    setActiveTab('dashboard');
    onClose();
  };

  if (!isOpen) return null;

  const IconComponent = currentStep.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-[#0A0E1A] border border-cyan-500/30 rounded-3xl shadow-2xl shadow-cyan-950/40 overflow-hidden">
        {/* Glow Header Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500" />

        {/* Top Header Bar */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${currentStep.iconColor}`}>
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                {currentStep.badge}
              </span>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-300">{currentStep.locationTe}</span>
                <span className="text-slate-500 font-sans">({currentStep.locationEn})</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSkip}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-700/60 transition-colors"
            title="Skip Tour (దాటవేయి)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Main Title & Description */}
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white tracking-wide">
              {currentStep.titleTe}
            </h2>
            <h3 className="text-sm font-semibold text-cyan-300">
              {currentStep.titleEn}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed pt-1">
              {currentStep.descTe}
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed italic">
              "{currentStep.descEn}"
            </p>
          </div>

          {/* Highlights Box */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              ✨ ముఖ్యమైన ఫీచర్లు (Key Capabilities):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentStep.highlightsTe.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contextual Action Shortcut if Voice / Chat Step */}
          {currentStep.id === 'voice' && onOpenVoice && (
            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between">
              <span className="text-xs text-purple-200">
                🎙️ ఇప్పుడే వాయిస్ మాట్లాడటానికి ప్రయత్నించండి:
              </span>
              <button
                onClick={() => {
                  onClose();
                  onOpenVoice();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition-colors cursor-pointer"
              >
                Open Voice Mode
              </button>
            </div>
          )}

          {currentStep.id === 'ai-adviser' && onOpenChat && (
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between">
              <span className="text-xs text-cyan-200">
                🤖 AI చాట్ బాక్స్‌ను ఇప్పుడే ఓపెన్ చేయండి:
              </span>
              <button
                onClick={() => {
                  onClose();
                  onOpenChat();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors cursor-pointer"
              >
                Open AI Chat
              </button>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="p-6 pt-3 bg-slate-950/80 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Progress Indicators & Checkbox */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentStepIndex
                      ? 'w-6 bg-cyan-400'
                      : idx < currentStepIndex
                      ? 'w-2 bg-cyan-800'
                      : 'w-2 bg-slate-700'
                  }`}
                  title={`Go to Step ${idx + 1}`}
                />
              ))}
            </div>

            <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="rounded border-white/20 bg-slate-800 text-cyan-500 focus:ring-0 cursor-pointer"
              />
              <span>Don't show automatically on startup (ఆటోమేటిక్‌గా చూపించవద్దు)</span>
            </label>
          </div>

          {/* Navigation Buttons: Previous, Skip, Next / Get Started */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={handleSkip}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              Skip (దాటవేయి)
            </button>

            {!isFirstStep && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-white/10 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous (వెనుకకు)</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 via-indigo-600 to-cyan-500 hover:from-cyan-500 hover:to-indigo-500 shadow-lg shadow-cyan-950/50 transition-all cursor-pointer"
            >
              <span>{isLastStep ? 'Get Started (ప్రారంభించండి)' : 'Next (తర్వాత)'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
