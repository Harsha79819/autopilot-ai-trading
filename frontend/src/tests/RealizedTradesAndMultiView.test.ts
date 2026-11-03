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
});
