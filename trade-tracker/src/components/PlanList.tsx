import type { Plan } from '../core/state';
import { formatMoney, formatRiskPercent, formatWhen } from '../format';

const directions: Record<Plan['direction'], string> = { long: 'Long', short: 'Short' };

/**
 * Plans as the log holds them. 1R leads each row because it is the denominator
 * every result on that Plan will later be measured in.
 *
 * Prices print raw rather than as money: a coin quoted at 0.00001234 would
 * round to $0.00 and the Stop would read as though it sat at zero.
 */
export default function PlanList({ plans }: { plans: readonly Plan[] }) {
  return (
    <section className="plans" aria-labelledby="plans-heading">
      <h2 className="plans__heading" id="plans-heading">
        Plans
      </h2>
      {plans.length === 0 ? (
        <p className="plans__empty">No Plan sized yet.</p>
      ) : (
        <ul className="plans__list">
          {/* Newest first: the Plan being acted on is the one just sized. */}
          {[...plans].reverse().map((plan) => (
            <li className="plan" key={plan.id} aria-label={'Plan ' + directions[plan.direction]}>
              <p className="plan__headline">
                <span className="plan__direction">{directions[plan.direction]}</span>
                <span className="plan__entry">at {plan.entryPrice}</span>
                <span className="plan__oneR">1R {formatMoney(plan.oneR)}</span>
              </p>
              <p className="plan__detail">
                <span>Stop {plan.stopPrice}</span>
                <span>Notional {formatMoney(plan.notional)}</span>
                <span>Margin {formatMoney(plan.margin)}</span>
                <span>{plan.leverage}x</span>
              </p>
              <p className="plan__detail">
                <span>Risk {formatRiskPercent(plan.riskFraction)}</span>
                <span>Liquidation {plan.liquidationPrice}</span>
                <span>{formatWhen(plan.at)}</span>
              </p>
              {plan.aboveDefaultRisk && <p className="plan__flag">Above default Risk</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
