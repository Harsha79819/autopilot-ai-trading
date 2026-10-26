import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Bot,
  User as UserIcon,
  Maximize2,
  Globe,
  TrendingUp,
  Landmark,
  Layers
} from 'lucide-react';
import { api } from '../../services/api';
import { useTrading } from '../../context/TradingContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  warnings?: { level: string; code: string; message: string }[];
}

interface AiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CopilotMode = 'all' | 'market' | 'wealth';

export const AiChatModal: React.FC<AiChatModalProps> = ({ isOpen, onClose }) => {
  const { refreshPortfolio, refreshAutoPilot, setActiveTab } = useTrading();
  const [mode, setMode] = useState<CopilotMode>('all');
  const [isTelugu, setIsTelugu] = useState(true);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `నమస్కారం! నేను మీ **AutoPilot Unified AI Financial & Market Copilot** ని. 

నేను **లైవ్ మార్కెట్ ట్రేడింగ్** (ఎగ్జిక్యూషన్, 1:2 RR, స్టాప్-లాస్, ఆటో-ఆర్డర్లు) మరియు **సంపూర్ణ వెల్త్ ప్లానింగ్** (SIP, EMI, రిటైర్మెంట్, స్ట్రెస్ టెస్టింగ్) రెండింటినీ ఏకీకృతంగా నిర్వహించగలను.

మీరు నన్ను తెలుగులో లేదా English లో ఏమైనా అడగవచ్చు:
- 📊 **ఈరోజు ఏం జరిగింది?** (Today's Trades & Profit Targets)
- 💡 **₹5,000 SIP వెల్త్ ప్లాన్** (SIP compounding with inflation)
- 📉 **మార్కెట్ -10% పడిపోతే?** (What-if Crash Stress Test)
- ⚠️ **సిస్టమ్ డయాగ్నోస్టిక్స్** (Error & Safety Status)
- 🏢 **INFY vs TCS పోలిక** (Fundamentals & Valuation)`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeWarnings, setActiveWarnings] = useState<{ level: string; code: string; message: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsLoading(true);

    try {
      const chatHistory = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content
      }));

      const res = await api.chatWithAi(chatHistory);

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        warnings: res.warnings
      };

      setMessages((prev) => [...prev, aiMsg]);
      if (res.warnings && res.warnings.length > 0) {
        setActiveWarnings(res.warnings);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ క్షమించండి, AI సర్వర్ నుండి స్పందన పొందడంలో సమస్య వచ్చింది: ${err.message || 'Unknown error'}. దయచేసి మళ్లీ ప్రయత్నించండి.`,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshUpdates = async () => {
    setIsLoading(true);
    await Promise.allSettled([refreshPortfolio(), refreshAutoPilot()]);
    await sendMessage("ఈరోజు జరిగిన తాజా మార్కెట్ అప్‌డేట్స్, పోర్ట్‌ఫోలియో స్థితి మరియు ఎర్రర్లు ఏమైనా ఉంటే చెప్పు (Refresh updates)");
  };

  const handleOpenFullScreen = () => {
    setActiveTab('ai-adviser');
    onClose();
  };

  const handleToggleLanguage = () => {
    const next = !isTelugu;
    setIsTelugu(next);
    sendMessage(next ? "ఇకపై సమాధానాలు తెలుగులో ఇవ్వండి (Respond in Telugu)" : "Respond in English from now on");
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass max-w-2xl w-full h-[90vh] max-h-[780px] flex flex-col relative border border-white/20 shadow-2xl overflow-hidden rounded-2xl"
      >
        {/* Chat Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  AutoPilot Unified AI Copilot
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Market & Wealth AI
                </span>
              </div>
              <p className="text-[11px] text-muted-labels flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live NSE Feed · Quant Execution · Deterministic Financial Planner</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Language Switcher */}
            <button
              onClick={handleToggleLanguage}
              disabled={isLoading}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                isTelugu
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:border-white/20'
              }`}
              title="Toggle Telugu / English language"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isTelugu ? 'తెలుగు' : 'English'}</span>
            </button>

            {/* Expand to Full View Button */}
            <button
              onClick={handleOpenFullScreen}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-violet-300 bg-violet-950/40 hover:bg-violet-900/50 border border-violet-500/30 transition-all cursor-pointer"
              title="Open full-screen AI Adviser view"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ఫుల్ స్క్రీన్</span>
            </button>

            {/* Instant Refresh Button */}
            <button
              onClick={handleRefreshUpdates}
              disabled={isLoading}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh and ask AI for latest updates"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Unified Mode Switcher Bar */}
        <div className="px-4 py-2 bg-slate-950/70 border-b border-white/5 flex items-center gap-1.5 text-xs overflow-x-auto scrollbar-none">
          <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mode:</span>
          </span>
          <button
            onClick={() => setMode('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'all'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>🌐 All-in-One</span>
          </button>
          <button
            onClick={() => setMode('market')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'market'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>📈 Market & Trades</span>
          </button>
          <button
            onClick={() => setMode('wealth')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'wealth'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>🏛️ Wealth & Planning</span>
          </button>
        </div>

        {/* Highlighted Warning / Error Banner (if any) */}
        {activeWarnings.length > 0 && (
          <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/25 flex items-center justify-between text-xs text-amber-300 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>System Notice:</strong> {activeWarnings[0].message}
              </span>
            </div>
            <button
              onClick={() => setActiveWarnings([])}
              className="text-[11px] text-amber-400/80 hover:text-amber-200 underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
          {messages.map((m) => {
            const isAi = m.role === 'assistant';
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isAi ? 'items-start' : 'items-start flex-row-reverse'}`}
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white shadow-md ${
                    isAi
                      ? 'bg-gradient-to-tr from-violet-600 to-indigo-600'
                      : 'bg-blue-600'
                  }`}
                >
                  {isAi ? <Bot className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                </div>

                <div className={`max-w-[85%] space-y-1.5 ${isAi ? 'text-left' : 'text-right'}`}>
                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl leading-relaxed whitespace-pre-wrap break-words ${
                      isAi
                        ? 'bg-slate-900/90 text-slate-100 border border-white/10 shadow-lg'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    }`}
                  >
                    {m.content}
                  </div>
                  <span className="text-[10px] text-muted-labels block px-1">
                    {m.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-violet-600/30 border border-violet-500/30 flex items-center justify-center text-violet-300">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 text-slate-300 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>AI లైవ్ డేటా మరియు పోర్ట్‌ఫోలియోను విశ్లేషిస్తోంది...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Dynamic Contextual Chips by Mode */}
        <div className="px-4 py-2 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto text-[11px] bg-slate-950/40 scrollbar-none">
          {mode === 'all' && (
            <>
              <button
                onClick={() => sendMessage("ఈరోజు ట్రేడింగ్ సమ్మరీ ఏంటి? బాట్ ఏం చేసింది? (Today's summary)")}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex-shrink-0 transition-all cursor-pointer whitespace-nowrap"
              >
                📊 ఈరోజు సమ్మరీ
              </button>
              <button
                onClick={() => sendMessage('Calculate ₹5,000 monthly SIP compounding for 10 years with 6% inflation adjustment.')}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/20 flex-shrink-0 transition-all cursor-pointer whitespace-nowrap"
              >
                💡 ₹5,000 SIP ప్లాన్
              </button>
              <button
                onClick={() => sendMessage('Simulate a -10% market crash on my holdings and show projected drawdown.')}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 flex-shrink-0 transition-all cursor-pointer whitespace-nowrap"
              >
                📉 -10% మార్కెట్ క్రాష్ టెస్ట్
              </button>
              <button
                onClick={() => sendMessage("సిస్టమ్‌లో ఏదైనా ఎర్రర్ లేదా ఇష్యూ ఉందా చెక్ చేయి (Check issues & errors)")}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 flex-shrink-0 transition-all cursor-pointer whitespace-nowrap"
              >
                ⚠️ ఎర్రర్స్ & డయాగ్నోస్టిక్స్
              </button>
              <button
                onClick={() => sendMessage('Compare fundamentals of INFY and TCS including debt-to-equity and ROE.')}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 flex-shrink-0 transition-all cursor-pointer whitespace-nowrap"
              >
                🏢 INFY vs TCS పోలిక
              </button>
              <button
                onClick={() => sendMessage("నా క్యాష్ బ్యాలెన్స్ మరియు పోర్ట్‌ఫోలియో స్టేటస్ చెప్పు (Portfolio status)")}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex-shrink-0 transition-all cursor-pointer whitespace-nowrap"
              >
                💰 క్యాష్ & పోర్ట్‌ఫోలియో
              </button>
            </>
          )}

          {mode === 'market' && (
            <>
              <button
                onClick={() => sendMessage("ఈరోజు ట్రేడింగ్ సమ్మరీ ఏంటి? బాట్ ఏం చేసింది? (Today's summary)")}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 flex-shrink-0 transition-all cursor-pointer whitespace-nowrap"
              >
                📊 ఈరోజు ట్రేడ్స్ & లాభాలు
              </button>
              <button
                onClick={() => sendMessage("మార్కెట్ ఎలా ఉంది? బెస్ట్ స్టాక్స్ ఏవి? (Market analysis)")}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex-shrink-0 transition-all cursor-pointer whitespace-nowrap"
              >
                📈 నిఫ్టీ 50 బెస్ట్ స్టాక్స్
              </button>
              <button
                onClick={() => sendMessage('Explain how our 1:2 Risk-Reward ratio and Stop-Loss (1.5%) are currently performing.')}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 flex-shrink-0 transition-all cursor-pointer whitespace-nowrap"
              >
                🎯 1:2 RR & స్టాప్-లాస్
              </button>
              <button
                onClick={() => sendMessage("సిస్టమ్‌లో ఏదైనా ఎర్రర్ లేదా ఇష్యూ ఉందా చెక్ చేయి (Check issues & errors)")}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 flex-shrink-0 transition-all cursor-pointer whitespace-nowrap"
              >
                ⚠️ సిస్టమ్ డయాగ్నోస్టిక్స్
              </button>
              <button
                onClick={() => sendMessage('What is the current state of the AutoPilot autonomous trading loop?')}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex-shrink-0 transition-all cursor-pointer whitespace-nowrap"
              >
                🤖 ఆటోపైలట్ బాట్ స్థితి
              </button>
            </>
          )}

          {mode === 'wealth' && (
            <>
              <button
                onClick={() => sendMessage('Calculate ₹5,000 monthly SIP returns for 10 years with 6% inflation adjustment.')}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/20 flex-shrink-0 transition-all cursor-pointer whitespace-nowrap"
              >
                💡 ₹5,000 SIP (ద్రవ్యోల్బణంతో)
              </button>
              <button
                onClick={() => sendMessage('Simulate a -10% market crash on my holdings and show projected drawdown.')}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 flex-shrink-0 transition-all cursor-pointer whitespace-nowrap"
              >
                📉 -10% మార్కెట్ క్రాష్ టెస్ట్
              </button>
              <button
                onClick={() => sendMessage('Calculate EMI for ₹25,00,000 home loan at 8.5% interest for 20 years.')}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 flex-shrink-0 transition-all cursor-pointer whitespace-nowrap"
              >
                🏠 లోన్ EMI కాలిక్యులేటర్
              </button>
              <button
                onClick={() => sendMessage('Explain the 6-month emergency fund rule and how much I need for ₹30,000 monthly expenses.')}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 flex-shrink-0 transition-all cursor-pointer whitespace-nowrap"
              >
                🛡️ 6 నెలల ఎమర్జెన్సీ ఫండ్
              </button>
              <button
                onClick={() => sendMessage('Compare fundamentals of INFY and TCS including debt and ROE.')}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex-shrink-0 transition-all cursor-pointer whitespace-nowrap"
              >
                🏢 INFY vs TCS ఫండమెంటల్స్
              </button>
            </>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-slate-900/90 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={
              isTelugu
                ? "మార్కెట్ ట్రేడింగ్ లేదా వెల్త్ ప్లానింగ్ గురించి అడగండి (ఉదా: ఈరోజు సమ్మరీ, SIP, స్ట్రెస్ టెస్ట్)..."
                : "Ask about live trades, 1:2 RR, SIP calculations, or stress tests..."
            }
            disabled={isLoading}
            className="flex-1 bg-white/5 border border-white/15 focus:border-cyan-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 transition-all"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
