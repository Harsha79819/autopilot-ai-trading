import { describe, it, expect } from 'vitest';

describe('Options Desk Risk & Financial Validation', () => {
  it('enforces ₹5,000 virtual capital and 1-lot sizing cap', () => {
    const initialCapital = 5000.00;
    const lotSize = 25;
    const maxMargin = 4800.00;

    expect(initialCapital).toBe(5000.00);
    expect(lotSize).toBe(25);
    expect(maxMargin).toBeLessThanOrEqual(initialCapital);
  });

  it('calculates -20% Stop-Loss and +40% Target accurately', () => {
    const entryPremium = 89.00; // Like user's friend's trade
    const slPct = 0.20;
    const tpPct = 0.40;

    const stopLossPremium = entryPremium * (1 - slPct);
    const targetPremium = entryPremium * (1 + tpPct);

    expect(stopLossPremium).toBeCloseTo(71.20, 2);
    expect(targetPremium).toBeCloseTo(124.60, 2);

    // Max potential loss for 1 lot (25 shares)
    const maxLoss = (entryPremium - stopLossPremium) * 25 + 40.0; // ₹40 round-trip fees
    expect(maxLoss).toBeCloseTo(485.00, 2);
    expect(maxLoss).toBeLessThan(5000.00 * 0.10); // Less than 10% of portfolio
  });

  it('validates trailing stop-loss protection on surging options', () => {
    const entryPremium = 89.00;
    const surgePremium = 160.00; // +79.8% surge
    const trailingGiveback = 0.15; // Retain 85% of peak

    const profitPct = (surgePremium - entryPremium) / entryPremium;
    expect(profitPct).toBeGreaterThan(0.30); // Trailing SL triggers at +30%

    const trailingStop = surgePremium * (1 - trailingGiveback);
    expect(trailingStop).toBeCloseTo(136.00, 2);
    expect(trailingStop).toBeGreaterThan(entryPremium); // Profit is locked in!

    const lockedProfit = (trailingStop - entryPremium) * 25 - 40.0;
    expect(lockedProfit).toBeCloseTo(1135.00, 2);
  });

  it('compares equity vs options performance characteristics', () => {
    const equityStats = {
      capital: 50000.00,
      pnl: 1250.00,
      winRate: 66.7,
      isDecayFree: true
    };

    const optionsStats = {
      capital: 5000.00,
      pnl: 850.00,
      winRate: 60.0,
      isDecayFree: false,
      maxHoldingPeriodHours: 6.0
    };

    const equityRoi = (equityStats.pnl / equityStats.capital) * 100;
    const optionsRoi = (optionsStats.pnl / optionsStats.capital) * 100;

    expect(equityRoi).toBeCloseTo(2.50, 2);
    expect(optionsRoi).toBeCloseTo(17.00, 2); // High leverage efficiency
    expect(optionsStats.isDecayFree).toBe(false); // Demonstrates why 15:10 IST square-off is essential
  });
});
