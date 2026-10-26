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
  Newspaper
} from 'lucide-react';
import { api } from '../../services/api';
import { useTrading } from '../../context/TradingContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  { label: '📊 Analyze My Portfolio', prompt: 'Analyze my current portfolio and explain my risk exposure.' },
  { label: '💡 ₹5,000 SIP Wealth Plan', prompt: 'Calculate ₹5,000 monthly SIP returns for 10 years with inflation adjustment.' },
  { label: '📉 What If Market Crashes 10%?', prompt: 'Simulate a -10% market drop on my holdings and show projected drawdown.' },
  { label: '🏢 Compare INFY vs TCS', prompt: 'Compare fundamentals of INFY and TCS including debt and return on equity.' },
  { label: '🇮🇳 తెలుగులో ఈరోజు సమ్మరీ', prompt: 'ఈరోజు మార్కెట్ సమ్మరీ మరియు నా పోర్ట్‌ఫోలియో అప్‌డేట్స్ తెలుగులో చెప్పు.' },
];

export const AiAdviserFullView: React.FC = () => {
  const { portfolio } = useTrading();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I am your **AutoPilot AI Financial Adviser & Intelligence Copilot**.\n\nI can analyze your portfolio, calculate SIP & retirement compounding, run what-if stress tests, research Nifty 50 fundamentals, and provide advice in English or Telugu.\n\nHow can I assist your financial journey today?',
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
              AI Financial Adviser & Copilot
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Deterministic Engine
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Natural language financial advisory, goal planning, and portfolio intelligence in English & Telugu
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

      {/* Quick Prompts Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {QUICK_PROMPTS.map((qp, idx) => (
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
