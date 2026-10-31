import React, { useState, useRef, useEffect } from 'react';
import {
  BrainCircuit,
  Send,
  Sparkles,
  RefreshCw,
  Globe,
  TrendingUp,
  ShieldAlert,
  Calculator,
  Newspaper,
  Landmark,
  Layers,
  Download,
  Compass,
  FileSpreadsheet,
  PauseCircle,
  PlayCircle,
  Search
} from 'lucide-react';
import { api } from '../../services/api';
import { useTrading } from '../../context/TradingContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

type CopilotMode = 'all' | 'market' | 'wealth';

const PROMPTS_BY_MODE = {
  all: [
    { label: '🎮 AI Control & Live Brain', prompt: 'AI ప్రస్తుతం ఏం చేస్తోంది, నియంత్రణ వివరాలు చెప్పు (AI control & live thoughts)' },
    { label: '🔄 Scan 38 Stocks Now', prompt: 'మొత్తం 38 స్టాక్స్‌ను ఇప్పుడే స్కాన్ చేయి (Scan all 38 stocks now)' },
    { label: '📈 +1% Daily Compounding Formula', prompt: 'డైలీ కాంపౌండింగ్ ఫార్ములా (+1% Daily Compound) ప్రోగ్రెస్ మరియు టార్గెట్స్ చూపించు' },
    { label: '📥 Day 1-to-Future Excel Ledger', prompt: 'Day 1 నుండి నేటి వరకు రోజువారీ ఎక్సెల్ డేటా చూపించు (Show daily Excel ledger data)' },
    { label: '🎓 Website Features Tour', prompt: 'ఈ వెబ్‌సైట్ ఫీచర్లు ఏంటి? ఎక్కడ ఉన్నాయో గైడ్ చేయి (Platform features tour)' },
    { label: '📊 Analyze My Portfolio', prompt: 'Analyze my current portfolio and explain my risk exposure.' },
    { label: '💡 ₹5,000 SIP Wealth Plan', prompt: 'Calculate ₹5,000 monthly SIP returns for 10 years with inflation adjustment.' },
    { label: '📉 What If Market Crashes 10%?', prompt: 'Simulate a -10% market drop on my holdings and show projected drawdown.' },
    { label: '🏢 Compare INFY vs TCS', prompt: 'Compare fundamentals of INFY and TCS including debt and return on equity.' },
    { label: '⚠️ System Error Diagnostics', prompt: 'సిస్టమ్‌లో ఏదైనా ఎర్రర్ లేదా ఇష్యూ ఉందా చెక్ చేయి (Check issues & errors)' }
  ],
  market: [
    { label: '⏸️ Pause AutoPilot', prompt: 'AutoPilot trading pause cheyu (Pause AutoPilot)' },
    { label: '▶️ Resume AutoPilot', prompt: 'AutoPilot start cheyu (Resume AutoPilot)' },
    { label: '🔄 Scan 38 Stocks', prompt: 'మొత్తం 38 స్టాక్స్‌ను ఇప్పుడే స్కాన్ చేయి (Scan all 38 stocks now)' },
    { label: '📊 Today\'s Trades & PnL', prompt: 'ఈరోజు ట్రేడింగ్ సమ్మరీ ఏంటి? బాట్ ఏం చేసింది? (Today\'s summary)' },
    { label: '📈 Top Nifty 50 Candidates', prompt: 'మార్కెట్ ఎలా ఉంది? బెస్ట్ స్టాక్స్ ఏవి? (Market analysis)' },
    { label: '🎯 1:2 RR & Stop-Loss Check', prompt: 'Explain how our 1:2 Risk-Reward ratio and Stop-Loss (1.5%) are currently performing.' },
    { label: '⚠️ System Diagnostics', prompt: 'Check if there are any stale quotes or risk warnings.' },
    { label: '🤖 AutoPilot Engine State', prompt: 'What is the current state of the AutoPilot autonomous trading loop?' }
  ],
  wealth: [
    { label: '💡 ₹5,000 SIP (Inflation-Adjusted)', prompt: 'Calculate ₹5,000 monthly SIP returns for 10 years with 6% inflation adjustment.' },
    { label: '📉 -10% Market Crash Stress Test', prompt: 'Simulate a -10% market crash on my holdings and show projected drawdown.' },
    { label: '🏠 ₹25L Home Loan EMI Plan', prompt: 'Calculate EMI for ₹25,00,000 home loan at 8.5% interest for 20 years.' },
    { label: '🛡️ 6-Month Emergency Fund Rule', prompt: 'Explain the 6-month emergency fund rule and how much I need for ₹30,000 monthly expenses.' },
    { label: '🏢 INFY vs TCS Fundamentals', prompt: 'Compare fundamentals of INFY and TCS including debt and ROE.' }
  ]
};

export const AiAdviserFullView: React.FC = () => {
  const { portfolio, setActiveTab } = useTrading();
  const [mode, setMode] = useState<CopilotMode>('all');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I am your **AutoPilot Unified AI Financial & Market Copilot**.\n\nI can analyze your portfolio, calculate SIP & retirement compounding, run what-if stress tests, track live Nifty 50 trades, and provide advice in English or Telugu.\n\nHow can I assist your financial journey today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTelugu, setIsTelugu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.chatWithAi(history);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Failed to get AI response: ${err.message || 'Network error'}. Please check if the backend server is running.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto animate-fade-in">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-white/10 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              AutoPilot Unified AI Copilot
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Market & Wealth Intelligence
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live NSE market execution, portfolio analytics, and deterministic personal wealth planning in English & Telugu
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            const next = !isTelugu;
            setIsTelugu(next);
            handleSend(next ? 'తెలుగులో వివరణ ఇవ్వండి' : 'Provide responses in English');
          }}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            isTelugu
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-slate-800 text-slate-300 border-white/10 hover:border-white/20'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{isTelugu ? 'భాష: తెలుగు (Telugu)' : 'Language: English'}</span>
        </button>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900/90 border border-white/10 overflow-x-auto text-xs">
        <span className="text-[11px] text-slate-400 px-2 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Mode:</span>
        </span>
        <button
          onClick={() => setMode('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            mode === 'all'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>🌐 All-in-One (అన్నీ)</span>
        </button>
        <button
          onClick={() => setMode('market')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            mode === 'market'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>📈 Market & Trades</span>
        </button>
        <button
          onClick={() => setMode('wealth')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            mode === 'wealth'
              ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Landmark className="w-3.5 h-3.5" />
          <span>🏛️ Wealth & Planning</span>
        </button>
      </div>

      {/* Dynamic Quick Prompts Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {PROMPTS_BY_MODE[mode].map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(qp.prompt)}
            disabled={loading}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-white/5 hover:border-cyan-500/30 text-xs text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>{qp.label}</span>
          </button>
        ))}
      </div>

      {/* Chat Transcript Area */}
      <div className="h-[520px] rounded-2xl bg-slate-950/60 border border-white/10 shadow-inner p-4 sm:p-6 overflow-y-auto space-y-4">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none shadow-lg'
                    : 'bg-slate-900/90 text-slate-200 border border-white/10 rounded-tl-none shadow-md'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                {/* Interactive Action Shortcuts under AI Messages */}
                {!isUser && (msg.content.includes('daily-ledger/download') || msg.content.includes('ఎక్సెల్ డేటా')) && (
                  <div className="pt-3 mt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => api.downloadDailyLedgerCsv()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>📥 Download Excel Sheet (.csv)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('reports')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-white/10 transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Open Reports View</span>
                    </button>
                  </div>
                )}

                {/* Interactive AutoPilot Control Toolbar under AI Messages */}
                {!isUser && (
                  msg.content.includes('నియంత్రణ') ||
                  msg.content.includes('User Control') ||
                  msg.content.includes('AutoPilot PAUSED') ||
                  msg.content.includes('AutoPilot RESUMED') ||
                  msg.content.includes('స్కాన్ ఫలితాలు') ||
                  msg.content.includes('Live Market Scan') ||
                  msg.content.includes('పూర్తి పారదర్శకత') ||
                  msg.content.includes('AutoPilot Live Quant') ||
                  msg.content.includes('AutoPilot లైవ్ క్వాంట్')
                ) && (
                  <div className="pt-3 mt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSend(isTelugu ? "AutoPilot trading pause cheyu" : "pause autopilot")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 shadow-md transition-all cursor-pointer"
                      title="Pause autonomous trading"
                    >
                      <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>⏸️ Pause AutoPilot</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSend(isTelugu ? "AutoPilot start cheyu" : "resume autopilot")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-200 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 shadow-md transition-all cursor-pointer"
                      title="Resume autonomous trading"
                    >
                      <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>▶️ Resume AutoPilot</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSend(isTelugu ? "మొత్తం 38 స్టాక్స్‌ను ఇప్పుడే స్కాన్ చేయి" : "scan 38 stocks now")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-cyan-200 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 shadow-md transition-all cursor-pointer"
                      title="Scan all 38 liquid stocks"
                    >
                      <Search className="w-3.5 h-3.5 text-cyan-400" />
                      <span>🔄 Scan 38 Stocks</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSend(isTelugu ? "AI ప్రస్తుతం ఏం చేస్తోంది, నియంత్రణ వివరాలు చెప్పు" : "what is ai doing and show control")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-violet-300 hover:text-white bg-violet-900/40 hover:bg-violet-800/50 border border-violet-500/30 transition-colors cursor-pointer"
                      title="View live AI thoughts and control details"
                    >
                      <BrainCircuit className="w-3.5 h-3.5 text-violet-400" />
                      <span>🧠 Live AI Brain</span>
                    </button>
                  </div>
                )}

                <div className={`mt-2 text-[10px] text-right ${isUser ? 'text-blue-200' : 'text-slate-500'}`}>
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-900/90 text-slate-400 border border-white/10 rounded-2xl rounded-tl-none p-4 text-xs flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>Analyzing portfolio data and financial models...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 p-2 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isTelugu ? 'మీ ప్రశ్నను ఇక్కడ అడగండి (ఉదా: నా పోర్ట్‌ఫోలియో రిస్క్ ఎంత?)...' : 'Ask any financial question (e.g. Compare INFY vs TCS, SIP calculation, stress test)...'}
          disabled={loading}
          className="flex-1 bg-transparent px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 disabled:opacity-40 transition-all cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
