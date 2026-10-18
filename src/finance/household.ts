import type { FinancialProfile, LineItem } from '@/types/profile';
import { sum } from './money';

const SUPPORT_LABEL = /\b(parents?|mother|father|mom|dad|family support|sent? (money )?home|money sent)\b/i;

/** A recurring expense that supports parents or family, flagged explicitly or recognised by its label. */
export function isFamilySupport(item: LineItem): boolean {
  return item.familySupport === true || SUPPORT_LABEL.test(item.label);
}

/** Monthly money sent to parents or family. */
export function familySupportMonthly(p: FinancialProfile): number {
  return sum([...p.cashflow.essential, ...p.cashflow.lifestyle].filter(isFamilySupport).map((l) => Math.max(0, l.amount)));
}

/**
 * Whether anyone relies on this income, for protection scoring.
 * Recurring support to parents counts unless the person has said their parents are not dependents.
 */
export function hasDependents(p: FinancialProfile): boolean {
  if (p.about.dependents > 0) return true;
  return familySupportMonthly(p) > 0 && p.about.parentsAsDependents !== false;
}

/** True when the onboarding question about parents should be asked. */
export function shouldAskAboutParents(p: FinancialProfile): boolean {
  return p.about.dependents === 0 && familySupportMonthly(p) > 0 && p.about.parentsAsDependents === undefined;
}
