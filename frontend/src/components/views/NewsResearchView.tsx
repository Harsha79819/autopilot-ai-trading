import React, { useState, useEffect } from 'react';
import {
  Newspaper,
  TrendingUp,
  TrendingDown,
  Building2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search
} from 'lucide-react';
import { api } from '../../services/api';
import { formatINR } from '../../utils/currency';

export const NewsResearchView: React.FC = () => {
  const [news, setNews] = useState<any[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('INFY');
  const [company, setCompany] = useState<any>(null);
  const [comparison, setComparison] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getNews().then((res) => setNews(res.articles || [])).catch(console.error);
    api.compareCompanies().then(setComparison).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    api.getCompanyProfile(selectedSymbol)
      .then(setCompany)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedSymbol]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-white/10 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Newspaper className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Market Intelligence, News Sentiment & Research
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Curated financial news, algorithmic sentiment classification, and fundamental valuation profiles
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: News Feed */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Verified Market News & Implications</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">Live Feed</span>
          </h3>

          <div className="space-y-3">
            {news.map((item) => {
              const isBull = item.sentiment === 'BULLISH';
              const isBear = item.sentiment === 'BEARISH';
              return (
                <div key={item.id} className="p-4 rounded-xl bg-slate-900/80 border border-white/5 hover:border-white/10 transition-colors space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{item.source}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                      isBull ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                      isBear ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-slate-800 text-slate-300 border-white/10'
                    }`}>
                      {item.sentiment}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-white leading-snug">{item.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.summary}</p>
                  <div className="pt-2 border-t border-white/5 text-[11px] text-cyan-300 flex items-start gap-1.5">
                    <strong>Implication:</strong>
                    <span>{item.impact_implications}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Company Fundamental Deep-Dive */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white">Company Fundamental Profile</h3>

          {/* Symbol Selector Pills */}
          <div className="flex flex-wrap gap-1.5">
            {['INFY', 'TCS', 'ITC', 'BEL', 'HDFCBANK'].map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSymbol(s)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  selectedSymbol === s
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-900 text-slate-400 border-white/5 hover:border-white/10'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {company && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-white text-sm">{company.name} ({company.symbol})</h4>
                <span className="text-[11px] text-slate-400">{company.sector} • {company.industry}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                  <span className="text-[10px] text-slate-500 block">P/E Ratio</span>
                  <span className="font-bold text-slate-200">{company.pe_ratio}x</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                  <span className="text-[10px] text-slate-500 block">ROE %</span>
                  <span className="font-bold text-emerald-400">{company.roe_pct}%</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                  <span className="text-[10px] text-slate-500 block">Debt to Equity</span>
                  <span className="font-bold text-cyan-400">{company.debt_to_equity}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                  <span className="text-[10px] text-slate-500 block">Div Yield</span>
                  <span className="font-bold text-purple-400">{company.dividend_yield_pct}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-[11px] text-emerald-300">
                  <strong>Bullish Case:</strong> {company.bullish_thesis}
                </div>
                <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/20 text-[11px] text-rose-300">
                  <strong>Risk Factors:</strong> {company.bearish_risks}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
