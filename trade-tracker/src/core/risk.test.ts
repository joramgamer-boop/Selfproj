import {
  isPlannableRiskFraction,
  MAX_RISK_FRACTION,
  MIN_RISK_FRACTION,
  riskFractionOf,
  riskPercentOf,
} from './risk';

describe('Risk as a percentage of Balance', () => {
  it('reads a stored fraction back as the percentage that was typed', () => {
    expect(riskPercentOf(0.02)).toBe(2);
    expect(riskPercentOf(0.025)).toBe(2.5);
    expect(riskPercentOf(0.03)).toBe(3);
  });

  it('does not let a tenth of a percent drift on the way in or out', () => {
    // 2.9 / 100 is 0.028999999999999998, and 0.029 × 100 is
    // 2.9000000000000004. Both directions have to land back on the figure the
    // trader typed, or the field redraws itself as 2.9000000000000004.
    expect(riskFractionOf(2.9)).toBe(0.029);
    expect(riskPercentOf(0.029)).toBe(2.9);
    expect(riskPercentOf(riskFractionOf(2.9))).toBe(2.9);
  });

  it('describes the band in whole percentages', () => {
    expect(riskPercentOf(MIN_RISK_FRACTION)).toBe(2);
    expect(riskPercentOf(MAX_RISK_FRACTION)).toBe(3);
  });
});

describe('the Risk a Plan may use', () => {
  it('allows anything from 2% to 3%', () => {
    expect(isPlannableRiskFraction(0.02)).toBe(true);
    expect(isPlannableRiskFraction(riskFractionOf(2.5))).toBe(true);
    expect(isPlannableRiskFraction(0.03)).toBe(true);
  });

  it('refuses more than 3%, which the simulations put at real risk of ruin', () => {
    expect(isPlannableRiskFraction(riskFractionOf(3.1))).toBe(false);
    expect(isPlannableRiskFraction(0.08)).toBe(false);
  });

  it('refuses less than 2%, because the framework calls for a fixed Risk', () => {
    expect(isPlannableRiskFraction(riskFractionOf(1.9))).toBe(false);
  });

  it('refuses a figure that is not a number at all', () => {
    expect(isPlannableRiskFraction(Number.NaN)).toBe(false);
    expect(isPlannableRiskFraction(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
