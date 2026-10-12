import type { FinancialProfile } from '@/types/profile';
import { ASSET_CLASSES } from '@/types/profile';
import { sum } from './money';

export interface BalanceSheet {
  cash: number; // bank savings + emergency fund
  investments: number;
  retirement: number;
  otherAssets: number;
  totalAssets: number;
  liabilities: number;
  netWorth: number;
}

export function portfolioValue(p: FinancialProfile): number {
  return sum(ASSET_CLASSES.map((c) => Math.max(0, p.position.holdings[c] ?? 0)));
}

export function balanceSheet(p: FinancialProfile): BalanceSheet {
  const cash = Math.max(0, p.position.cashSavings) + Math.max(0, p.position.emergencyFund);
  const investments = portfolioValue(p);
  const retirement = Math.max(0, p.position.retirement.balance);
  const otherAssets = Math.max(0, p.position.otherAssets);
  const totalAssets = cash + investments + retirement + otherAssets;
  const liabilities = sum(p.liabilities.map((l) => Math.max(0, l.balance)));
  return { cash, investments, retirement, otherAssets, totalAssets, liabilities, netWorth: totalAssets - liabilities };
}
