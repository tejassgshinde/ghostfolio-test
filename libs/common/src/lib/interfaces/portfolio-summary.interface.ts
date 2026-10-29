import { FireWealth } from './fire-wealth.interface';
import { PortfolioPerformance } from './portfolio-performance.interface';

export interface PortfolioSummary extends PortfolioPerformance {
  activityCount: number;
  annualizedPerformancePercent: number;
  annualizedPerformancePercentWithCurrencyEffect: number;
  cash: number;
  dateOfFirstActivity?: Date;
  dividendYieldPercent: number;
  dividendYieldPercentWithCurrencyEffect: number;
  emergencyFund: {
    assets: number;
    cash: number;
    total: number;
  };
  excludedAccountsAndActivities: number;
  fees: number;
  filteredValueInBaseCurrency?: number;
  /**
   * Fraction (0.5 = 50%). share = (filtered assets − liabilities in that
   * filter) / total net worth. Total net worth = all assets incl. cash minus
   * all liabilities, excluding accounts/activities marked 'excluded from
   * analysis'. Liabilities count under the account they were recorded on and
   * under no asset class. Undefined when the total net worth is 0.
   */
  filteredValueInPercentage?: number;
  fireWealth: FireWealth;
  grossPerformance: number;
  grossPerformanceWithCurrencyEffect: number;
  interestInBaseCurrency: number;
  liabilitiesInBaseCurrency: number;
  totalAssetsInBaseCurrency: number;
  totalBuy: number;
  totalCashInBaseCurrency: number;
  totalSell: number;
  totalValueInBaseCurrency?: number;
}
