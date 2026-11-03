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
import { ProductTourModal } from './components/onboarding/ProductTourModal';
import { StrategyInfo } from './types';
import { api } from './services/api';
import { Sliders, TrendingUp, BarChart2, Layers, Receipt, Table, ShoppingCart, Radio, Sparkles } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeTab, portfolio } = useTrading();
  const { t } = useLanguage();
  const [chartViewMode, setChartViewMode] = useState<'equity' | 'live_market' | 'both'>('equity');
  
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

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12 relative z-10">
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

      {/* Tab: Dashboard (matching reference screenshots media_1792471364217.png and media_1792471364220.png) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          {/* Top Bar with Badges, AI Bot Trigger, Voice Copilot, and Automation Status */}
          <HeaderBar
            onOpenDiagnostics={() => setShowDiagnosticsModal(true)}
            onOpenChat={() => setShowAiChatModal(true)}
            onOpenVoice={() => setShowVoiceModal(true)}
            onOpenTour={() => setShowTourModal(true)}
          />

          {/* Hero Portfolio Card */}
          <HeroPortfolioCard />

          {/* Three Main Option Cards: Invest, Portfolio/PnL, Withdraw */}
          <ThreeOptionCards
            onOpenInvest={() => setShowInvestModal(true)}
            onOpenPortfolio={() => setShowPortfolioModal(true)}
            onOpenWithdraw={() => setShowWithdrawModal(true)}
          />

          {/* Two-Column Middle Grid: Open Position & Market Scanner */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <OpenPositionsCard />
            <MarketScannerCard />
          </div>

          {/* Bottom Row: Risk Status, Data Source, Emergency Control */}
          <BottomStatusGrid onOpenDiagnostics={() => setShowDiagnosticsModal(true)} />

          {/* Today's Daily Summary & Trade Journal Box */}
          <div className="pt-2">
            <DailySummaryCard onOpenJournal={() => setShowJournalModal(true)} />
          </div>

          {/* AI Autonomous Bot Live Feed Banner */}
          <div className="pt-2">
            <AutoPilotBanner />
          </div>

          {/* Multi-View Workspace Module Selector ("ఒకేసారి multiple open ayyela chey") */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 rounded-xl bg-slate-950/70 border border-white/10 shadow-lg">
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 pl-1">
                {t('మల్టీ-వ్యూ ప్యానెల్స్:', 'Multi-View Panels:')}
              </span>

              <button
                type="button"
                onClick={() => togglePanel('realizedTable')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  panels.realizedTable
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>{t('🟢 అమ్మేసిన ట్రేడ్స్ & కాలిక్యులేటర్', '🟢 Realized Trades & Calculator')}</span>
              </button>

              <button
                type="button"
                onClick={() => togglePanel('charts')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  panels.charts
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{t('📈 చార్టులు', '📈 Charts')}</span>
              </button>

              <button
                type="button"
                onClick={() => togglePanel('dailyLedger')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  panels.dailyLedger
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>{t('📑 15-రోజుల లెడ్జర్', '📑 15-Day Ledger')}</span>
              </button>

              <button
                type="button"
                onClick={() => togglePanel('orders')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  panels.orders
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{t('⚡ ఆర్డర్లు', '⚡ Orders')}</span>
              </button>

              <button
                type="button"
                onClick={() => togglePanel('scanner')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  panels.scanner
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>{t('🔍 స్కానర్ టేబుల్', '🔍 Scanner Table')}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={showAllPanels}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 transition-all cursor-pointer shadow-md shrink-0 active:scale-95"
              title={t('అన్ని ప్యానెల్స్ ఒకేసారి చూడండి', 'View all modules simultaneously')}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t('అన్నీ ఒకేసారి చూడు (Show All)', 'Show All Modules')}</span>
            </button>
          </div>

          {/* Module 1: Realized Trades & Live Interactive Calculator */}
          {panels.realizedTable && (
            <div className="pt-2 animate-fade-in">
              <RealizedPnLCard />
            </div>
          )}

          {/* Module 2: Equity Trajectory & Live Stock Market Chart Section */}
          {panels.charts && (
            <div className="pt-2 space-y-3 animate-fade-in">
              {/* Chart View Switcher Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setChartViewMode('equity')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      chartViewMode === 'equity'
                        ? 'bg-accent-cyan text-slate-950 font-bold shadow-md shadow-accent-cyan/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>{t('📈 ఈక్విటీ ట్రాజెక్టరీ (పోర్ట్‌ఫోలియో ప్రయాణం)', '📈 Equity Trajectory Chart')}</span>
                  </button>

                  <button
                    onClick={() => setChartViewMode('live_market')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      chartViewMode === 'live_market'
                        ? 'bg-emerald-400 text-slate-950 font-bold shadow-md shadow-emerald-400/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>{t('📊 లైవ్ మార్కెట్ చార్ట్ (రియల్-టైమ్)', '📊 Live Stock Market Graph')}</span>
                  </button>

                  <button
                    onClick={() => setChartViewMode('both')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      chartViewMode === 'both'
                        ? 'bg-accent-violet text-white font-bold shadow-md shadow-accent-violet/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{t('⚡ రెండు చార్టులు (Both)', '⚡ Both Charts')}</span>
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
                  {(chartViewMode === 'equity' || chartViewMode === 'both') && (
                    <PerformanceChart />
                  )}
                  {(chartViewMode === 'live_market' || chartViewMode === 'both') && (
                    <LiveStockChart />
                  )}
                </div>
                <div>
                  <OrderForm />
                </div>
              </div>
            </div>
          )}

          {/* Module 3: Day-by-Day Financial Accounting Ledger Table */}
          {panels.dailyLedger && (
            <div className="pt-2 animate-fade-in">
              <DashboardDailyLedgerCard />
            </div>
          )}

          {/* Module 4: Order Execution & Order History */}
          {panels.orders && (
            <div className="pt-2 space-y-4 animate-fade-in">
              <OrderHistory />
            </div>
          )}

          {/* Module 5: Optional In-Dashboard Full Scanner Table */}
          {panels.scanner && (
            <div className="pt-2 animate-fade-in">
              <ScannerTable />
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
