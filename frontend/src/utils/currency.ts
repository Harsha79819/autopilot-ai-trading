/**
 * Indian Rupee (INR) and Financial Formatting Utilities
 */

export function formatINR(amount: number | undefined | null, decimals: number = 2): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0.00';
  }
  
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  
  // Format with standard Indian numbering format (e.g., ₹1,23,456.78)
  const parts = absVal.toFixed(decimals).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1] ? `.${parts[1]}` : '';
  
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }
  
  return `${isNegative ? '-' : ''}₹${integerPart}${decimalPart}`;
}

export function formatPct(val: number | undefined | null, includeSign: boolean = true): string {
  if (val === undefined || val === null || isNaN(val)) {
    return '0.00%';
  }
  const prefix = includeSign && val > 0 ? '+' : '';
  return `${prefix}${val.toFixed(2)}%`;
}

export function getPnLColor(val: number | undefined | null): string {
  if (!val || Math.abs(val) < 0.001) return 'text-slate-400';
  return val > 0 ? 'text-emerald-400' : 'text-rose-400';
}

export function getPnLBg(val: number | undefined | null): string {
  if (!val || Math.abs(val) < 0.001) return 'bg-slate-800/50 text-slate-400 border-slate-700/50';
  return val > 0 
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
    : 'bg-rose-500/10 text-rose-400 border-rose-500/20';
}
