import type { ClosePosition } from '../core/commands';
import type { Clock } from '../core/clock';
import type { Position } from '../core/state';
import { formatWhen } from '../format';
import type { RecordResult } from '../useTradeTracker';
import ClosePositionForm from './ClosePositionForm';
import PlanFigures from './PlanFigures';

interface PositionPanelProps {
  position: Position;
  clock: Clock;
  onClose: (command: ClosePosition) => Promise<RecordResult>;
}

/**
 * The live trade, sitting directly under the Balance because while it is open
 * it is the only thing on the screen that can still cost anything. It shows
 * the Plan untouched — 1R above all, since that is what the close will be
 * measured against.
 */
export default function PositionPanel({ position, clock, onClose }: PositionPanelProps) {
  const { plan } = position;

  return (
    <section className="position" aria-label="Open Position">
      <p className="position__label">Open Position</p>
      <PlanFigures plan={plan} />
      <p className="figures__detail">
        <span>Liquidation {plan.liquidationPrice}</span>
        <span>Opened {formatWhen(position.openedAt)}</span>
      </p>
      <ClosePositionForm position={position} clock={clock} onClose={onClose} />
    </section>
  );
}
