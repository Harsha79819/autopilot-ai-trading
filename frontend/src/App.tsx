import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
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
import { StrategyInfo } from './types';
import { api } from './services/api';
import { Sliders } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeTab, portfolio } = useTrading();
  const [strategies, setStrategies] = useState<StrategyInfo[]>([]);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [showAiChatModal, setShowAiChatModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);

  useEffect(() => {
    api.getStrategies().then(setStrategies).catch(console.error);
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

      {/* Floating AI Chat Assistant Trigger Button */}
      <FloatingChatButton
        isOpen={showAiChatModal}
        onClick={() => setShowAiChatModal(true)}
      />

      {/* Tab: Dashboard (matching reference screenshots media_1792471364217.png and media_1792471364220.png) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          {/* Top Bar with Badges, AI Bot Trigger and Automation Status */}
          <HeaderBar
            onOpenDiagnostics={() => setShowDiagnosticsModal(true)}
            onOpenChat={() => setShowAiChatModal(true)}
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

          {/* Equity Chart & Order History Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-4">
            <div className="lg:col-span-2">
              <PerformanceChart />
            </div>
            <div>
              <OrderForm />
            </div>
          </div>
          <OrderHistory />
        </div>
      )}

      {/* Tab: Scanner */}
      {activeTab === 'scanner' && (
        <div className="space-y-6">
          <ScannerTable />
        </div>
      )}

      {/* Tab: Strategies */}
      {activeTab === 'strategies' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Quantitative Strategy Lab</h2>
            <p className="text-xs text-slate-400">
              Modular transparent trading strategies with non-bypassable risk controls and cost awareness
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {strategies.map((strat) => (
              <StrategyCard key={strat.name} strategy={strat} />
            ))}
          </div>
          <CostGateWidget />
        </div>
      )}

      {/* Tab: Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <OrderForm />
            </div>
            <div className="lg:col-span-2">
              <OrderHistory />
            </div>
          </div>
          <AuditLogView />
        </div>
      )}

      {/* Tab: Backtest */}
      {activeTab === 'backtest' && (
        <div className="space-y-6">
          <BacktestRunner />
        </div>
      )}

      {/* Tab: AI Adviser */}
      {activeTab === 'ai-adviser' && <AiAdviserFullView />}

      {/* Tab: Markets */}
      {activeTab === 'markets' && <MarketsView />}

      {/* Tab: Watchlist */}
      {activeTab === 'watchlist' && <WatchlistView />}

      {/* Tab: Portfolio Detail */}
      {activeTab === 'portfolio' && <PortfolioDetailView />}

      {/* Tab: Risk Centre */}
      {activeTab === 'risk-centre' && <RiskCentreView />}

      {/* Tab: Research & News */}
      {activeTab === 'research' && <NewsResearchView />}

      {/* Tab: Financial Planner */}
      {activeTab === 'planner' && <FinancialPlannerView />}

      {/* Tab: Alerts Manager */}
      {activeTab === 'alerts' && <AlertsManagerView />}

      {/* Tab: Documents Intelligence */}
      {activeTab === 'documents' && <DocumentsView />}

      {/* Tab: Reports & Tax */}
      {activeTab === 'reports' && <ReportsView />}

      {/* Tab: Settings */}
      {activeTab === 'settings' && <SettingsView />}


      {/* Modals */}
      {showRiskModal && <RiskSettingsModal onClose={() => setShowRiskModal(false)} />}
      <InvestModal isOpen={showInvestModal} onClose={() => setShowInvestModal(false)} />
      <WithdrawModal isOpen={showWithdrawModal} onClose={() => setShowWithdrawModal(false)} />
      {showPortfolioModal && portfolio && (
        <CostBreakdownModal portfolio={portfolio} onClose={() => setShowPortfolioModal(false)} />
      )}
      <DiagnosticsModal isOpen={showDiagnosticsModal} onClose={() => setShowDiagnosticsModal(false)} />
      <AiChatModal isOpen={showAiChatModal} onClose={() => setShowAiChatModal(false)} />
      <TradingJournalModal isOpen={showJournalModal} onClose={() => setShowJournalModal(false)} />
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
      <TradingProvider>
        <div className="min-h-screen bg-[#080B12] text-slate-100 relative overflow-hidden flex flex-col">
          {/* Animated Drifting Gradient Orbs in #080B12 base */}
          <div className="orb-container">
            <div className="orb-blue" />
            <div className="orb-violet" />
            <div className="orb-cyan" />
          </div>

          <Navbar />
          <MainContent />
          <MobileTabs />
        </div>
      </TradingProvider>
    </AuthProvider>
  );
};

export default App;
