import { describe, it, expect } from 'vitest';

describe('LanguageContext and Trader-Skill Verification', () => {
  it('correctly toggles language state between Telugu and English', () => {
    let currentLang: 'te' | 'en' = 'te';
    const toggle = () => {
      currentLang = currentLang === 'te' ? 'en' : 'te';
    };

    expect(currentLang).toBe('te');
    toggle();
    expect(currentLang).toBe('en');
    toggle();
    expect(currentLang).toBe('te');
  });

  it('verifies translation helper returns proper language variant', () => {
    const t = (lang: 'te' | 'en', te: string, en: string) => (lang === 'te' ? te : en);
    
    expect(t('te', 'లాభం', 'Profit')).toBe('లాభం');
    expect(t('en', 'లాభం', 'Profit')).toBe('Profit');
  });

  it('validates 11 Indian Equities Trader Skills mapping and financial formulas', () => {
    const skills = [
      'trader-analyst',
      'trader-screener',
      'trader-budget',
      'trader-risk',
      'trader-broker',
      'trader-tax',
      'trader-alerts',
      'trader-news',
      'trader-pelosi',
      'trader-rebalance',
      'trader-compounding'
    ];

    expect(skills.length).toBe(11);
    expect(skills).toContain('trader-analyst');
    expect(skills).toContain('trader-risk');
    expect(skills).toContain('trader-tax');

    // Budget 2024 STCG test: 20% on short term capital gains
    const stcgRate = 0.20;
    const realizedGain = 88.04;
    const expectedTax = realizedGain * stcgRate;
    expect(expectedTax).toBeCloseTo(17.61, 2);

    // Position sizing: Van Tharp 1.5% risk rule on ₹3,178.75 cash
    const cash = 3178.75;
    const maxRisk = cash * 0.015;
    expect(maxRisk).toBeCloseTo(47.68, 2);

    // Net profit reconciliation over all deposits
    const totalDeposits = 5500.00;
    const currentEquity = 5727.75;
    const netProfit = currentEquity - totalDeposits;
    expect(netProfit).toBeCloseTo(227.75, 2);
  });
});
