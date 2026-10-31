/**
 * Monetary precision utilities.
 * 
 * Rules:
 * - All internal values are integer minor units (paise for INR / cents for USD).
 * - Floating point arithmetic is strictly confined to fractional percentage scaling,
 *   with immediate deterministic half-up rounding (Math.round).
 * - Final invoice and line totals must never be negative (clamped to 0).
 */

export class MoneyUtil {
  /**
   * Rounds a fractional minor unit deterministically to the nearest integer.
   */
  static round(amount: number): number {
    return Math.round(amount);
  }

  /**
   * Calculates a percentage portion of a minor-unit amount.
   * e.g., 18% of 10000 paise = Math.round((10000 * 18.0) / 100) = 1800 paise.
   */
  static calculatePercentage(baseMinorUnits: number, ratePercentage: number): number {
    if (ratePercentage <= 0 || baseMinorUnits <= 0) return 0;
    return Math.round((baseMinorUnits * ratePercentage) / 100);
  }

  /**
   * Extracts inclusive tax from a gross amount.
   * Formula: Tax = round(Gross * Rate / (100 + Rate))
   * Net = Gross - Tax
   */
  static extractInclusiveTax(grossMinorUnits: number, ratePercentage: number): {
    taxAmount: number;
    netAmount: number;
  } {
    if (ratePercentage <= 0 || grossMinorUnits <= 0) {
      return { taxAmount: 0, netAmount: grossMinorUnits };
    }
    const taxAmount = Math.round((grossMinorUnits * ratePercentage) / (100 + ratePercentage));
    const netAmount = grossMinorUnits - taxAmount;
    return { taxAmount, netAmount };
  }

  /**
   * Calculates exclusive tax for a net amount.
   * Formula: Tax = round(Net * Rate / 100)
   * Gross = Net + Tax
   */
  static calculateExclusiveTax(netMinorUnits: number, ratePercentage: number): {
    taxAmount: number;
    grossAmount: number;
  } {
    if (ratePercentage <= 0 || netMinorUnits <= 0) {
      return { taxAmount: 0, grossAmount: netMinorUnits };
    }
    const taxAmount = Math.round((netMinorUnits * ratePercentage) / 100);
    const grossAmount = netMinorUnits + taxAmount;
    return { taxAmount, grossAmount };
  }

  /**
   * Sums multiple minor unit amounts safely.
   */
  static sum(...amounts: number[]): number {
    return amounts.reduce((acc, curr) => acc + (Math.round(curr) || 0), 0);
  }

  /**
   * Ensures an amount cannot be negative.
   */
  static clampNonNegative(amount: number): number {
    return Math.max(0, Math.round(amount));
  }

  /**
   * Format minor units into display string (e.g., 125050 paise -> "₹1,250.50").
   */
  static format(amountMinorUnits: number, currency = 'INR'): string {
    const major = (amountMinorUnits / 100).toFixed(2);
    if (currency === 'INR') {
      return `₹${major}`;
    }
    return `${currency} ${major}`;
  }
}
