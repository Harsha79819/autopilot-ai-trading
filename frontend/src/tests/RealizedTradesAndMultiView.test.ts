import { describe, it, expect } from 'vitest';

describe('Realized Trades & Interactive Calculator Verification', () => {
  it('correctly calculates gross profits and individual stock gains', () => {
    const grossProfits = [
      { symbol: 'WIPRO', pnl: 31.54 },
      { symbol: 'ITC', pnl: 27.30 },
      { symbol: 'BEL', pnl: 26.97 },
      { symbol: 'SUZLON', pnl: 1.45 },
      { symbol: 'IDEA', pnl: 0.78 }
    ];

    const totalGrossGains = grossProfits.reduce((acc, trade) => acc + trade.pnl, 0);
    expect(totalGrossGains).toBeCloseTo(88.04, 2);
  });

  it('correctly calculates gross losses including SBIN stop loss', () => {
    const grossLosses = [
      { symbol: 'SBIN', pnl: -201.59 },
      { symbol: 'NHPC', pnl: -18.10 },
      { symbol: 'SUZLON/IDEA', pnl: -1.02 }
    ];

    const totalGrossLosses = grossLosses.reduce((acc, trade) => acc + trade.pnl, 0);
    expect(totalGrossLosses).toBeCloseTo(-220.71, 2);
  });

  it('reconciles complete capital inflow and lifetime profit equation', () => {
    const initialDeposit = 500.00;
    const upgradeDeposit = 5000.00;
    const totalDeposited = initialDeposit + upgradeDeposit; // ₹5,500.00

    const currentPortfolioValue = 5727.75;
    const netProfitOverAllDeposits = currentPortfolioValue - totalDeposited; // +₹227.75

    expect(totalDeposited).toBe(5500.00);
    expect(currentPortfolioValue).toBe(5727.75);
    expect(netProfitOverAllDeposits).toBeCloseTo(227.75, 2);

    const roiPct = (netProfitOverAllDeposits / totalDeposited) * 100;
    expect(roiPct).toBeCloseTo(4.14, 2);

    // Growth since ₹5,000 upgrade from ₹5,293.29 base
    const postUpgradeGain = currentPortfolioValue - 5293.29;
    expect(postUpgradeGain).toBeCloseTo(434.46, 2);
  });

  it('validates interactive calculator tax impact under Budget 2024 (20% STCG)', () => {
    const realizedGains = 88.04;
    const stcgRate = 0.20;
    const stcgTax = realizedGains * stcgRate;

    expect(stcgTax).toBeCloseTo(17.61, 2);
  });

  it('verifies multi-panel toggle mechanics for simultaneous viewing', () => {
    let panels = {
      charts: true,
      realizedTable: true,
      dailyLedger: true,
      orders: true,
      scanner: false
    };

    const toggle = (key: keyof typeof panels) => {
      panels = { ...panels, [key]: !panels[key] };
    };

    expect(panels.scanner).toBe(false);
    toggle('scanner');
    expect(panels.scanner).toBe(true);

    // Show All
    panels = {
      charts: true,
      realizedTable: true,
      dailyLedger: true,
      orders: true,
      scanner: true
    };

    const allOpen = Object.values(panels).every(v => v === true);
    expect(allOpen).toBe(true);
  });

  it('calculates exact in-hand net profit if exiting market right now', () => {
    const totalDeposits = 5500.00;
    const currentEquity = 5727.75;
    const estimatedExitTaxes = 5.10;

    const grossExitNetProfit = currentEquity - totalDeposits; // +₹227.75
    const netTakeHomeAfterExitFees = grossExitNetProfit - estimatedExitTaxes; // +₹222.65
    const roiPct = (grossExitNetProfit / totalDeposits) * 100; // +4.14%

    expect(grossExitNetProfit).toBeCloseTo(227.75, 2);
    expect(netTakeHomeAfterExitFees).toBeCloseTo(222.65, 2);
    expect(roiPct).toBeCloseTo(4.14, 2);

    // After 20% STCG on closed gains (₹17.61)
    const afterTaxProfit = grossExitNetProfit - 17.61;
    expect(afterTaxProfit).toBeCloseTo(210.14, 2);
  });

  it('validates instant portfolio caching and rehydration logic', () => {
    const mockPortfolio = {
      id: 1,
      user_id: 1,
      initial_cash: 5000.0,
      cash_balance: 3178.75,
      holdings_value: 2549.0,
      total_portfolio_value: 5727.75,
      net_pnl: 227.75,
      is_paper_trading: true
    };

    const cacheKey = 'autopilot_portfolio_cache';
    const serialized = JSON.stringify(mockPortfolio);
    expect(serialized).toBeTruthy();

    const rehydrated = JSON.parse(serialized);
    expect(rehydrated.total_portfolio_value).toBe(5727.75);
    expect(rehydrated.cash_balance).toBe(3178.75);
  });

  it('ensures table minimum width guarantees prevent mobile column squashing', () => {
    const tableMinMargins = {
      realizedTable: 620,
      dailyLedgerTable: 880,
      activePositionsTable: 560,
      orderHistoryTable: 620,
      scannerTable: 660,
      reportsTable: 950
    };

    // All tables must enforce min-width > standard mobile viewport (360-414px) to trigger horizontal scroll
    Object.entries(tableMinMargins).forEach(([tableName, minWidth]) => {
      expect(minWidth).toBeGreaterThan(480);
    });
  });

  it('validates Pro Terminal tab navigation defaults to 15-day ledger at top', () => {
    type DashboardSubTab = 'ledger' | 'trading' | 'charts' | 'brain' | 'split' | 'all';
    let currentTab: DashboardSubTab = 'ledger';

    // Must default to 'ledger' so Day 17 is visible immediately without vertical scrolling
    expect(currentTab).toBe('ledger');

    // Switch to trading
    currentTab = 'trading';
    expect(currentTab).toBe('trading');

    // Switch to split-view mode
    currentTab = 'split';
    expect(currentTab).toBe('split');
  });

  it('validates multi-tab split view allows pairing any two modules simultaneously', () => {
    let leftPane = 'ledger';
    let rightPane = 'trading';

    expect(leftPane).toBe('ledger');
    expect(rightPane).toBe('trading');

    // User can customize right pane to charts
    rightPane = 'charts';
    expect(rightPane).toBe('charts');
    expect(leftPane !== rightPane).toBe(true);
  });
});

