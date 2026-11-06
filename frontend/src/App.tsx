import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { TradingProvider, useTrading } from './context/TradingContext';
import { Navbar } from './components/layout/Navbar';
import { MobileTabs } from './components/layout/MobileTabs';
import { HeaderBar } from './components/dashboard/HeaderBar';
import { HeroPortfolioCard } from './components/dashboard/HeroPortfolioCard';
import { ThreeOptionCards } from './components/dashboard/ThreeOptionCards';
import { OpenPositionsCard } from './components/dashboard/OpenPositionsCard';
import { MarketScannerCard } from './components/dashboard/MarketScannerCard';
import { BottomStatusGrid } from './components/dashboard/BottomStatusGrid';
import { DailySummaryCard } from './components/dashboard/DailySummaryCard';
import { AutoPilotBanner } from './components/dashboard/AutoPilotBanner';
import { PerformanceChart } from './components/dashboard/PerformanceChart';
import { LiveStockChart } from './components/dashboard/LiveStockChart';
import { DashboardDailyLedgerCard } from './components/dashboard/DashboardDailyLedgerCard';
import { RealizedPnLCard } from './components/dashboard/RealizedPnLCard';
import { AiDailyLearningCard } from './components/dashboard/AiDailyLearningCard';
import { useLanguage } from './context/LanguageContext';
import { ScannerTable } from './components/scanner/ScannerTable';
import { StrategyCard } from './components/strategies/StrategyCard';
import { CostGateWidget } from './components/strategies/CostGateWidget';
import { OrderForm } from './components/orders/OrderForm';
import { OrderHistory } from './components/orders/OrderHistory';
import { AuditLogView } from './components/orders/AuditLogView';
import { BacktestRunner } from './components/backtest/BacktestRunner';
import { RiskSettingsModal } from './components/risk/RiskSettingsModal';
import { InvestModal } from './components/modals/InvestModal';
import { WithdrawModal } from './components/modals/WithdrawModal';
import { CostBreakdownModal } from './components/dashboard/CostBreakdownModal';
import { DiagnosticsModal } from './components/modals/DiagnosticsModal';
import { AiChatModal } from './components/chat/AiChatModal';
import { FloatingChatButton } from './components/chat/FloatingChatButton';
import { VoiceConversationModal } from './components/voice/VoiceConversationModal';
import { TradingJournalModal } from './components/journal/TradingJournalModal';
import { AiAdviserFullView } from './components/views/AiAdviserFullView';
import { MarketsView } from './components/views/MarketsView';
import { WatchlistView } from './components/views/WatchlistView';
import { PortfolioDetailView } from './components/views/PortfolioDetailView';
import { RiskCentreView } from './components/views/RiskCentreView';
import { NewsResearchView } from './components/views/NewsResearchView';
import { FinancialPlannerView } from './components/views/FinancialPlannerView';
import { AlertsManagerView } from './components/views/AlertsManagerView';
import { DocumentsView } from './components/views/DocumentsView';
import { ReportsView } from './components/views/ReportsView';
import { SettingsView } from './components/views/SettingsView';
import { OrderBlockView } from './components/views/OrderBlockView';
import { ProductTourModal } from './components/onboarding/ProductTourModal';
import { ProCommandBar } from './components/dashboard/ProCommandBar';
import { StrategyInfo } from './types';
import { api } from './services/api';
import { Sliders, TrendingUp, BarChart2, Layers, Receipt, Table, ShoppingCart, Radio, Sparkles, Activity, Columns } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeTab, portfolio, aiStatus } = useTrading();
  const { t } = useLanguage();
  const [chartViewMode, setChartViewMode] = useState<'equity' | 'live_market' | 'both'>('equity');
  
  // Pro Terminal Sub-Tabs: Instant tab switching & multi-tab split view
  type DashboardSubTab = 'ledger' | 'trading' | 'charts' | 'brain' | 'split' | 'all';
  const [dashboardTab, setDashboardTab] = useState<DashboardSubTab>(() => {
    return (localStorage.getItem('autopilot_dashboard_pro_tab') as DashboardSubTab) || 'ledger';
  });
  const [splitLeftTab, setSplitLeftTab] = useState<'ledger' | 'trading' | 'charts' | 'brain'>('ledger');
  const [splitRightTab, setSplitRightTab] = useState<'ledger' | 'trading' | 'charts' | 'brain'>('trading');
  const [isExpandedHero, setIsExpandedHero] = useState<boolean>(() => {
    return localStorage.getItem('autopilot_expanded_hero') === 'true';
  });

  const handleSetDashboardTab = (tab: DashboardSubTab) => {
    setDashboardTab(tab);
    localStorage.setItem('autopilot_dashboard_pro_tab', tab);
  };

  const handleToggleExpandedHero = () => {
    setIsExpandedHero(prev => {
      const next = !prev;
      localStorage.setItem('autopilot_expanded_hero', String(next));
      return next;
    });
  };
  
  // Multi-View Workspace panels: allow users to open multiple sections simultaneously
  const [panels, setPanels] = useState({
    charts: true,
    realizedTable: true,
    dailyLedger: true,
    orders: true,
    scanner: false,
  });

  const togglePanel = (key: keyof typeof panels) => {
    setPanels(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const showAllPanels = () => {
    setPanels({
      charts: true,
      realizedTable: true,
      dailyLedger: true,
      orders: true,
      scanner: true,
    });
  };
  const [strategies, setStrategies] = useState<StrategyInfo[]>([]);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [showAiChatModal, setShowAiChatModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showTourModal, setShowTourModal] = useState(false);

  useEffect(() => {
    api.getStrategies().then(setStrategies).catch(console.error);

    // Event listener for opening the guided tour from anywhere in the app
    const handleOpenTour = () => setShowTourModal(true);
    window.addEventListener('open-product-tour', handleOpenTour);

    // Auto-launch guided tour on first visit
    const hasCompletedTour = localStorage.getItem('autopilot_tour_completed');
    if (!hasCompletedTour) {
      setShowTourModal(true);
    }

    return () => window.removeEventListener('open-product-tour', handleOpenTour);
  }, []);

  // Helper to render individual dashboard tab modules
  const renderTabContent = (tabKey: 'ledger' | 'trading' | 'charts' | 'brain') => {
    switch (tabKey) {
      case 'ledger':
        return (
          <div className="animate-fade-in space-y-4">
            <DashboardDailyLedgerCard />
          </div>
        );
      case 'trading':
        return (
          <div className="animate-fade-in space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              <OpenPositionsCard />
              <MarketScannerCard />
            </div>
          </div>
        );
      case 'charts':
        return (
          <div className="animate-fade-in space-y-4">
            {/* Chart View Switcher Controls with Distinct Radio Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setChartViewMode('equity')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                    chartViewMode === 'equity'
                      ? 'bg-cyan-500/25 text-cyan-200 font-bold border border-cyan-400/60 shadow-sm ring-1 ring-cyan-400/40'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${chartViewMode === 'equity' ? 'bg-cyan-400 ring-2 ring-cyan-400/50' : 'border border-slate-500'}`} />
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{t('ఈక్విటీ ట్రాజెక్టరీ', 'Equity Trajectory')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChartViewMode('live_market')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                    chartViewMode === 'live_market'
                      ? 'bg-emerald-500/25 text-emerald-200 font-bold border border-emerald-400/60 shadow-sm ring-1 ring-emerald-400/40'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${chartViewMode === 'live_market' ? 'bg-emerald-400 ring-2 ring-emerald-400/50' : 'border border-slate-500'}`} />
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>{t('లైవ్ మార్కెట్ చార్ట్', 'Live Stock Market')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChartViewMode('both')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                    chartViewMode === 'both'
                      ? 'bg-violet-500/25 text-violet-200 font-bold border border-violet-400/60 shadow-sm ring-1 ring-violet-400/40'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${chartViewMode === 'both' ? 'bg-violet-400 ring-2 ring-violet-400/50' : 'border border-slate-500'}`} />
                  <Layers className="w-3.5 h-3.5" />
                  <span>{t('రెండు చార్టులు (Both)', 'Both Charts')}</span>
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{t('లైవ్ NSE డేటా ఫీడ్ యాక్టివ్', 'Live NSE Data Feeds Active')}</span>
              </div>
            </div>

            {/* Grid Layout: Charts + Quick Order Form */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 space-y-4">
                {(chartViewMode === 'equity' || chartViewMode === 'both') && <PerformanceChart />}
                {(chartViewMode === 'live_market' || chartViewMode === 'both') && <LiveStockChart />}
              </div>
              <div>
                <OrderForm />
              </div>
            </div>

            <RealizedPnLCard />
            <OrderHistory />
          </div>
        );
      case 'brain':
        return (
          <div className="animate-fade-in space-y-4">
            <AutoPilotBanner />
            <AiDailyLearningCard />
            <DailySummaryCard onOpenJournal={() => setShowJournalModal(true)} />
            <BottomStatusGrid onOpenDiagnostics={() => setShowDiagnosticsModal(true)} />
          </div>
        );
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-3 sm:py-5 pb-24 md:pb-12 relative z-10">
      {/* Persistent Delayed Data Warning Banner */}
      {aiStatus && aiStatus.is_realtime === false && (
        <div className="mb-3.5 w-full bg-amber-500/15 border border-amber-500/40 text-amber-200 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-base flex-shrink-0">⚠️</span>
            <span>
              <strong>Delayed data (about 15 min):</strong> Do not use for real trading decisions.
            </span>
          </div>
          <span className="text-[11px] text-amber-300/80 hidden sm:inline whitespace-nowrap bg-amber-950/50 px-2 py-0.5 rounded border border-amber-500/20">
            Free Live NSE Feed · Paper Execution
          </span>
        </div>
      )}

      {/* Risk modal trigger floating button */}
      <button
        onClick={() => setShowRiskModal(true)}
        className="fixed right-4 sm:right-6 bottom-36 md:bottom-22 z-40 p-3 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 shadow-2xl transition-all cursor-pointer"
        title="Open Risk Settings"
      >
        <Sliders className="w-5 h-5 text-accent-cyan" />
      </button>

      {/* Floating AI Chat Assistant & Voice Trigger Button */}
      <FloatingChatButton
        isOpen={showAiChatModal || showVoiceModal}
        onClick={() => setShowAiChatModal(true)}
        onOpenVoice={() => setShowVoiceModal(true)}
      />

      {/* Tab: Dashboard (Pro Terminal with Instant Tabs & Multi-Tab Split) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          {/* Top Sticky Pro Command Bar (~52px compact header with live metrics and quick actions) */}
          <ProCommandBar
            onOpenInvest={() => setShowInvestModal(true)}
            onOpenWithdraw={() => setShowWithdrawModal(true)}
            onOpenPortfolio={() => setShowPortfolioModal(true)}
            onOpenDiagnostics={() => setShowDiagnosticsModal(true)}
            onOpenChat={() => setShowAiChatModal(true)}
            onOpenVoice={() => setShowVoiceModal(true)}
            onOpenTour={() => setShowTourModal(true)}
            isExpandedView={isExpandedHero}
            onToggleExpandedView={handleToggleExpandedHero}
          />

          {/* Optional Expanded Classic Hero Cards (Only visible when user toggles 'Hero Cards') */}
          {isExpandedHero && (
            <div className="space-y-4 animate-fade-in">
              <HeaderBar
                onOpenDiagnostics={() => setShowDiagnosticsModal(true)}
                onOpenChat={() => setShowAiChatModal(true)}
                onOpenVoice={() => setShowVoiceModal(true)}
                onOpenTour={() => setShowTourModal(true)}
              />
              <HeroPortfolioCard />
              <ThreeOptionCards
                onOpenInvest={() => setShowInvestModal(true)}
                onOpenPortfolio={() => setShowPortfolioModal(true)}
                onOpenWithdraw={() => setShowWithdrawModal(true)}
              />
            </div>
          )}

          {/* Pro Sub-Tab Selector Bar with Split Mode & Distinct Radio Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 rounded-xl bg-slate-950/80 border border-white/10 shadow-lg">
            <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll no-scrollbar text-xs py-0.5">
              {/* Tab 1: 15-Day Ledger */}
              <button
                type="button"
                onClick={() => handleSetDashboardTab('ledger')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  dashboardTab === 'ledger'
                    ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/60 shadow-sm ring-1 ring-cyan-400/40'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${dashboardTab === 'ledger' ? 'bg-cyan-400 ring-2 ring-cyan-400/50' : 'border border-slate-500'}`} />
                <Table className="w-3.5 h-3.5" />
                <span>{t('రోజువారీ లెడ్జర్ (Day 2 లైవ్)', 'Daily Ledger (Day 2 Live)')}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-400/20 text-cyan-300 font-mono font-bold">Day 2</span>
              </button>

              {/* Tab 2: Live Trading & Scanner */}
              <button
                type="button"
                onClick={() => handleSetDashboardTab('trading')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  dashboardTab === 'trading'
                    ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/60 shadow-sm ring-1 ring-emerald-400/40'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${dashboardTab === 'trading' ? 'bg-emerald-400 ring-2 ring-emerald-400/50' : 'border border-slate-500'}`} />
                <Activity className="w-3.5 h-3.5" />
                <span>{t('లైవ్ ట్రేడింగ్ & స్కానర్', 'Live Trading & Scanner')}</span>
              </button>

              {/* Tab 3: Realized Trades & Charts */}
              <button
                type="button"
                onClick={() => handleSetDashboardTab('charts')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  dashboardTab === 'charts'
                    ? 'bg-blue-500/25 text-blue-200 border border-blue-400/60 shadow-sm ring-1 ring-blue-400/40'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${dashboardTab === 'charts' ? 'bg-blue-400 ring-2 ring-blue-400/50' : 'border border-slate-500'}`} />
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{t('రియలైజ్డ్ ట్రేడ్స్ & చార్టులు', 'Realized Trades & Charts')}</span>
              </button>

              {/* Tab 4: AI Brain & Automation */}
              <button
                type="button"
                onClick={() => handleSetDashboardTab('brain')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  dashboardTab === 'brain'
                    ? 'bg-violet-500/25 text-violet-200 border border-violet-400/60 shadow-sm ring-1 ring-violet-400/40'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${dashboardTab === 'brain' ? 'bg-violet-400 ring-2 ring-violet-400/50' : 'border border-slate-500'}`} />
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('AGI బ్రెయిన్ & ఆటోమేషన్', 'AGI Brain & Automation')}</span>
              </button>
            </div>

            {/* Right: Multi-Tab Split Mode and Show All buttons */}
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => handleSetDashboardTab(dashboardTab === 'split' ? 'ledger' : 'split')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  dashboardTab === 'split'
                    ? 'bg-amber-500/25 text-amber-200 border border-amber-400/60 shadow-sm ring-1 ring-amber-400/40'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                }`}
                title={t('రెండు ట్యాబ్స్ పక్కపక్కనే ఒకేసారి తెరవండి', 'Open 2 tabs side-by-side simultaneously')}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>{t('⚡ స్ప్లిట్ 2 ట్యాబ్స్', '⚡ Split 2 Tabs')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSetDashboardTab(dashboardTab === 'all' ? 'ledger' : 'all')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  dashboardTab === 'all'
                    ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-400/60 shadow-sm ring-1 ring-indigo-400/40'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                }`}
                title={t('అన్ని మోడ్యూల్స్ ఒకే పేజీలో వరుసగా చూడండి', 'View all modules sequentially')}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{t('అన్నీ (All)', 'All')}</span>
              </button>
            </div>
          </div>

          {/* Tab 1 Content: 15-Day Daily Ledger (Day 17 at Top) */}
          {dashboardTab === 'ledger' && renderTabContent('ledger')}

          {/* Tab 2 Content: Live Trading & Scanner */}
          {dashboardTab === 'trading' && renderTabContent('trading')}

          {/* Tab 3 Content: Realized Trades & Charts */}
          {dashboardTab === 'charts' && renderTabContent('charts')}

          {/* Tab 4 Content: AI Brain & Automation */}
          {dashboardTab === 'brain' && renderTabContent('brain')}

          {/* Multi-Tab Split Mode: 2 Tabs Side-by-Side (or stacked on mobile) */}
          {dashboardTab === 'split' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900/80 border border-amber-500/30">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-300">
                    {t('ఎడమ ప్యానెల్ (Left):', 'Left Pane:')}
                  </span>
                  <select
                    value={splitLeftTab}
                    onChange={(e) => setSplitLeftTab(e.target.value as any)}
                    className="bg-slate-800 text-white text-xs rounded-lg px-2.5 py-1 border border-white/10"
                  >
                    <option value="ledger">📑 Daily Ledger (Day 2 Live)</option>
                    <option value="trading">⚡ Live Trading & Scanner</option>
                    <option value="charts">📊 Realized Trades & Charts</option>
                    <option value="brain">🧠 AGI Brain & Automation</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-300">
                    {t('కుడి ప్యానెల్ (Right):', 'Right Pane:')}
                  </span>
                  <select
                    value={splitRightTab}
                    onChange={(e) => setSplitRightTab(e.target.value as any)}
                    className="bg-slate-800 text-white text-xs rounded-lg px-2.5 py-1 border border-white/10"
                  >
                    <option value="trading">⚡ Live Trading & Scanner</option>
                    <option value="ledger">📑 Daily Ledger (Day 2 Live)</option>
                    <option value="charts">📊 Realized Trades & Charts</option>
                    <option value="brain">🧠 AGI Brain & Automation</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div className="space-y-4 overflow-hidden">
                  {renderTabContent(splitLeftTab)}
                </div>
                <div className="space-y-4 overflow-hidden">
                  {renderTabContent(splitRightTab)}
                </div>
              </div>
            </div>
          )}

          {/* All Modules View */}
          {dashboardTab === 'all' && (
            <div className="space-y-5 animate-fade-in">
              {renderTabContent('ledger')}
              {renderTabContent('trading')}
              {renderTabContent('charts')}
              {renderTabContent('brain')}
            </div>
          )}
        </div>
      )}

      {/* Tab: AI Adviser & Copilot (Hub 2) */}
      {activeTab === 'ai-adviser' && <AiAdviserFullView />}

      {/* Tab: Market Intelligence (Hub 3 - Consolidates Markets, Scanner, Watchlist, News) */}
      {(activeTab === 'markets' || activeTab === 'scanner' || activeTab === 'watchlist' || activeTab === 'research') && (
        <div className="space-y-6 animate-fade-in">
          <MarketsView />
          <ScannerTable />
          <NewsResearchView />
          <WatchlistView />
        </div>
      )}

      {/* Tab: Risk & Performance Reports (Hub 4 - Consolidates Risk Centre, Reports, Strategies, Backtesting) */}
      {(activeTab === 'risk-centre' || activeTab === 'reports' || activeTab === 'strategies' || activeTab === 'backtest') && (
        <div className="space-y-6 animate-fade-in">
          <RiskCentreView />
          <ReportsView />
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white mb-1">
              {t('క్వాంటిటేటివ్ స్ట్రాటజీ ల్యాబ్ & బ్యాక్‌టెస్ట్', 'Quantitative Strategy Lab & Backtesting')}
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {strategies.map((strat) => (
                <StrategyCard key={strat.name} strategy={strat} />
              ))}
            </div>
            <CostGateWidget />
          </div>
          <BacktestRunner />
        </div>
      )}

      {/* Tab: Financial Tools & Settings (Hub 5 - Consolidates Planner, Alerts, Documents, Settings) */}
      {(activeTab === 'planner' || activeTab === 'alerts' || activeTab === 'documents' || activeTab === 'settings') && (
        <div className="space-y-6 animate-fade-in">
          <FinancialPlannerView />
          <AlertsManagerView />
          <DocumentsView />
          <SettingsView />
        </div>
      )}

      {/* Tab: Live Order Block & Liquidity Terminal (SMC) */}
      {activeTab === 'orderblock' && (
        <div className="space-y-6 animate-fade-in">
          <OrderBlockView />
        </div>
      )}


      {/* Modals */}
      {showRiskModal && <RiskSettingsModal onClose={() => setShowRiskModal(false)} />}
      <InvestModal isOpen={showInvestModal} onClose={() => setShowInvestModal(false)} />
      <WithdrawModal isOpen={showWithdrawModal} onClose={() => setShowWithdrawModal(false)} />
      {showPortfolioModal && portfolio && (
        <CostBreakdownModal portfolio={portfolio} onClose={() => setShowPortfolioModal(false)} />
      )}
      <DiagnosticsModal isOpen={showDiagnosticsModal} onClose={() => setShowDiagnosticsModal(false)} />
      <AiChatModal
        isOpen={showAiChatModal}
        onClose={() => setShowAiChatModal(false)}
        onOpenVoice={() => setShowVoiceModal(true)}
        onOpenTour={() => setShowTourModal(true)}
      />
      <VoiceConversationModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onOpenTextChat={() => setShowAiChatModal(true)}
      />
      <TradingJournalModal isOpen={showJournalModal} onClose={() => setShowJournalModal(false)} />
      <ProductTourModal
        isOpen={showTourModal}
        onClose={() => setShowTourModal(false)}
        onOpenVoice={() => setShowVoiceModal(true)}
        onOpenChat={() => setShowAiChatModal(true)}
      />
    </main>
  );
};

export const App: React.FC = () => {
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        document.body.classList.add('tab-hidden');
      } else {
        document.body.classList.remove('tab-hidden');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return (
    <AuthProvider>
      <LanguageProvider>
        <TradingProvider>
          <div className="min-h-screen bg-[#0A0F1D] text-slate-100 relative overflow-hidden flex flex-col">
            {/* Animated Liquid Ambient Orbs & Fluid Mesh */}
            <div className="liquid-mesh-overlay" />
            <div className="orb-container">
              <div className="orb-blue" />
              <div className="orb-violet" />
              <div className="orb-cyan" />
            </div>

            <Navbar onOpenTour={() => window.dispatchEvent(new CustomEvent('open-product-tour'))} />
            <MainContent />
            <MobileTabs />
          </div>
        </TradingProvider>
      </LanguageProvider>
    </AuthProvider>
  );
};

export default App;
