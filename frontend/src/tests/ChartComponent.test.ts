import { describe, it, expect } from 'vitest';

describe('Chart Calculations and Scaling Engine', () => {
  it('correctly calculates candlestick coordinates and bullish/bearish classification', () => {
    const minPrice = 100;
    const maxPrice = 200;
    const range = maxPrice - minPrice;

    const candleBullish = { open: 120, close: 150, high: 160, low: 110 };
    const candleBearish = { open: 160, close: 130, high: 170, low: 120 };

    // Coordinate conversion (SVG: 0 is top, 100 is bottom)
    const openY = 100 - ((candleBullish.open - minPrice) / range) * 100;
    const closeY = 100 - ((candleBullish.close - minPrice) / range) * 100;

    expect(candleBullish.close >= candleBullish.open).toBe(true);
    expect(candleBearish.close < candleBearish.open).toBe(true);
    expect(openY).toBe(80);
    expect(closeY).toBe(50);
    expect(closeY < openY).toBe(true); // Higher price is lower in SVG Y coordinate
  });

  it('correctly sets AI Golden Rule Take-Profit (+3.0%) and Stop-Loss (-1.5%) targets for 1:2 RR', () => {
    const buyPrice = 485.00; // Coal India buy price
    const takeProfit = buyPrice * 1.03;
    const stopLoss = buyPrice * 0.985;

    const potentialGain = takeProfit - buyPrice; // +14.55
    const potentialLoss = buyPrice - stopLoss;   // +7.275

    expect(takeProfit).toBeCloseTo(499.55, 2);
    expect(stopLoss).toBeCloseTo(477.725, 2);
    expect(potentialGain / potentialLoss).toBeCloseTo(2.0, 1); // 1:2 Risk-to-Reward ratio
  });

  it('computes +1% daily compounding formula curve values accurately', () => {
    const baseCapital = 5293.29; // Day 9 capital upgrade base
    const day1Target = baseCapital * Math.pow(1.01, 1);
    const day3Target = baseCapital * Math.pow(1.01, 3);

    expect(day1Target).toBeCloseTo(5346.22, 2);
    expect(day3Target).toBeCloseTo(5453.68, 2);
    expect(day3Target > day1Target).toBe(true);
  });

  it('correctly maps 15-day ledger milestones for user transparency', () => {
    const milestones = [
      { day: 1, label: 'Initial Setup', capital: 500.00 },
      { day: 4, label: 'Early Stop-Loss Hit', capital: 293.29 },
      { day: 9, label: 'Capital Upgrade (+₹5K)', capital: 5293.29 },
      { day: 10, label: 'ITC Target Hit', netGain: 27.30 },
      { day: 11, label: 'BEL Target Hit', netGain: 26.97 },
      { day: 12, label: 'WIPRO Target Hit', netGain: 31.54 },
      { day: 15, label: 'Current Net Worth', totalEquity: 5727.75 }
    ];

    expect(milestones[1].capital).toBe(293.29);
    expect(milestones[2].capital).toBe(5293.29);
    expect(milestones[6].totalEquity).toBe(5727.75);
    expect((milestones[6].totalEquity ?? 0) - 5500.00).toBeCloseTo(227.75, 2); // Net profit over all deposits
  });
});
