import type { Plan } from '../core/state';
import { formatDirection, formatMoney } from '../format';

interface PlanFiguresProps {
  plan: Plan;
  /**
   * Where the Stop stands now, when that is no longer where the Plan put it.
   * Only a live Position has one — and it is the Stop shown, because it is the
   * one the exchange will fire on. What the Plan was sized at is not lost:
   * 1R is exactly that (ADR-0001), and it leads the row above.
   */
  stopPrice?: number;
}

/**
 * A Plan as every screen shows it, whether it is still a Plan, live as a
 * Position, or closed as a Trade — one rendering, so the figures cannot come
 * to read differently in one place than another.
 *
 * 1R leads the row because it is the denominator every result on this Plan
 * will be measured in. Prices print raw rather than as money: a coin quoted at
 * 0.00001234 would round to $0.00 and the Stop would read as though it sat at
 * zero.
 */
export default function PlanFigures({ plan, stopPrice }: PlanFiguresProps) {
  return (
    <>
      <p className="figures__headline">
        <span className="figures__direction">{formatDirection(plan.direction)}</span>
        <span className="figures__entry">at {plan.entryPrice}</span>
        <span className="figures__oneR">1R {formatMoney(plan.oneR)}</span>
      </p>
      <p className="figures__detail">
        <span>Stop {stopPrice ?? plan.stopPrice}</span>
        <span>Notional {formatMoney(plan.notional)}</span>
        <span>Margin {formatMoney(plan.margin)}</span>
        <span>{plan.leverage}x</span>
      </p>
    </>
  );
}
