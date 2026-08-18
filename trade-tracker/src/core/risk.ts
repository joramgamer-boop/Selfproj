/**
 * How much of the Balance a single Plan may put at risk. The band is a rule of
 * the framework, not a preference: the source notes' simulations put 5%+ at
 * real risk of ruin over a realistic year, and found raising 2% to 3% made the
 * median outcome *worse*. So 3% is a ceiling the app will not size past.
 *
 * The floor is deliberate too. The framework calls for a *fixed* 2–3% per
 * trade, and quietly risking less on the trades that feel frightening is a
 * behavioural leak that makes Expectancy across the log incomparable.
 */
export const DEFAULT_RISK_FRACTION = 0.02;
export const MIN_RISK_FRACTION = 0.02;
export const MAX_RISK_FRACTION = 0.03;

/**
 * Risk is chosen in tenths of a percent, so a fraction is carried to four
 * decimal places. Without this a field reading "2.9" arrives as
 * 0.028999999999999998 and every figure solved from it is a hair off the one
 * on screen.
 */
export function roundRiskFraction(fraction: number): number {
  return Math.round(fraction * 10_000) / 10_000;
}

/** The Plan screen talks in percent; the log stores fractions. */
export function riskPercentOf(fraction: number): number {
  // Rounded again on the way out: 0.029 × 100 lands on 2.9000000000000004.
  return Math.round(roundRiskFraction(fraction) * 100_000) / 1000;
}

export function riskFractionOf(percent: number): number {
  return roundRiskFraction(percent / 100);
}

export function isPlannableRiskFraction(fraction: number): boolean {
  if (!Number.isFinite(fraction)) return false;
  const bounded = roundRiskFraction(fraction);
  return bounded >= MIN_RISK_FRACTION && bounded <= MAX_RISK_FRACTION;
}
