import {
  CalculateTaxRequest,
  CalculateTaxResponse,
  AppliedTaxItem,
  TaxRule,
} from './tax.types';
import { MoneyUtil } from '../../utils/money';

export class TaxService {
  /**
   * Calculates taxes across multiple rules, supporting:
   * - Percentage and fixed amounts
   * - Inclusive and exclusive tax rules
   * - Inactive rule filtering
   * - Deterministic rounding in minor units
   */
  static calculate(request: CalculateTaxRequest): CalculateTaxResponse {
    const { taxableAmount, taxRules } = request;

    if (taxableAmount < 0) {
      throw new Error('Taxable amount cannot be negative');
    }

    // Filter active rules with valid rates/amounts
    const activeRules = taxRules.filter(
      (rule: TaxRule) =>
        rule.isActive &&
        ((rule.type === 'PERCENTAGE' && rule.ratePercentage > 0) ||
          (rule.type === 'FIXED' && rule.fixedAmount > 0))
    );

    if (activeRules.length === 0 || taxableAmount === 0) {
      return {
        taxableAmount,
        inclusiveTaxTotal: 0,
        exclusiveTaxTotal: 0,
        totalTax: 0,
        netAmount: taxableAmount,
        grossAmount: taxableAmount,
        appliedTaxes: [],
      };
    }

    const appliedTaxes: AppliedTaxItem[] = [];

    // Separate inclusive and exclusive rules
    const inclusiveRules = activeRules.filter((r) => r.isInclusive);
    const exclusiveRules = activeRules.filter((r) => !r.isInclusive);

    let inclusiveTaxTotal = 0;
    let netAmount = taxableAmount;

    // 1. Process Inclusive Taxes
    if (inclusiveRules.length > 0) {
      // Sum inclusive percentage rates
      const totalInclusivePct = inclusiveRules
        .filter((r) => r.type === 'PERCENTAGE')
        .reduce((sum, r) => sum + r.ratePercentage, 0);

      // Sum inclusive fixed amounts
      const totalInclusiveFixed = inclusiveRules
        .filter((r) => r.type === 'FIXED')
        .reduce((sum, r) => sum + r.fixedAmount, 0);

      const pctTaxTotal = totalInclusivePct > 0
        ? MoneyUtil.round(((taxableAmount - totalInclusiveFixed) * totalInclusivePct) / (100 + totalInclusivePct))
        : 0;

      inclusiveTaxTotal = pctTaxTotal + totalInclusiveFixed;
      netAmount = MoneyUtil.clampNonNegative(taxableAmount - inclusiveTaxTotal);

      // Distribute inclusive tax to individual line items
      let distributedPctTax = 0;
      const pctInclusiveRules = inclusiveRules.filter((r) => r.type === 'PERCENTAGE');
      
      for (let i = 0; i < pctInclusiveRules.length; i++) {
        const rule = pctInclusiveRules[i];
        let amount: number;
        if (i === pctInclusiveRules.length - 1) {
          // Last item gets remainder to ensure exact sum match
          amount = pctTaxTotal - distributedPctTax;
        } else {
          amount = MoneyUtil.round((pctTaxTotal * rule.ratePercentage) / totalInclusivePct);
          distributedPctTax += amount;
        }

        appliedTaxes.push({
          id: rule.id,
          name: rule.name,
          type: rule.type,
          ratePercentage: rule.ratePercentage,
          fixedAmount: rule.fixedAmount,
          inclusive: true,
          amount,
        });
      }

      for (const rule of inclusiveRules.filter((r) => r.type === 'FIXED')) {
        appliedTaxes.push({
          id: rule.id,
          name: rule.name,
          type: rule.type,
          ratePercentage: 0,
          fixedAmount: rule.fixedAmount,
          inclusive: true,
          amount: rule.fixedAmount,
        });
      }
    }

    // 2. Process Exclusive Taxes (calculated on netAmount)
    let exclusiveTaxTotal = 0;
    for (const rule of exclusiveRules) {
      let amount = 0;
      if (rule.type === 'PERCENTAGE') {
        amount = MoneyUtil.calculatePercentage(netAmount, rule.ratePercentage);
      } else if (rule.type === 'FIXED') {
        amount = rule.fixedAmount;
      }

      exclusiveTaxTotal += amount;
      appliedTaxes.push({
        id: rule.id,
        name: rule.name,
        type: rule.type,
        ratePercentage: rule.ratePercentage,
        fixedAmount: rule.fixedAmount,
        inclusive: false,
        amount,
      });
    }

    const totalTax = inclusiveTaxTotal + exclusiveTaxTotal;
    const grossAmount = netAmount + totalTax;

    return {
      taxableAmount,
      inclusiveTaxTotal,
      exclusiveTaxTotal,
      totalTax,
      netAmount,
      grossAmount,
      appliedTaxes,
    };
  }
}
