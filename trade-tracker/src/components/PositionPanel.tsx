import type { ClosePosition, MoveStop } from '../core/commands';
import type { Clock } from '../core/clock';
import type { Position } from '../core/state';
import { formatWhen } from '../format';
import type { RecordResult } from '../useTradeTracker';
import ClosePositionForm from './ClosePositionForm';
import MoveStopForm from './MoveStopForm';
import PlanFigures from './PlanFigures';
import Violations from './Violations';

interface PositionPanelProps {
  position: Position;
  clock: Clock;
  onClose: (command: ClosePosition) => Promise<RecordResult>;
  onMoveStop: (command: MoveStop) => Promise<RecordResult>;
}

/**
 * The live trade, sitting directly under the Balance because while it is open
 * it is the only thing on the screen that can still cost anything. It shows
 * the Plan untouched — 1R above all, since that is what the close will be
 * measured against.
 */
export default function PositionPanel({
  position,
  clock,
  onClose,
  onMoveStop,
}: PositionPanelProps) {
  const { plan } = position;

  return (
    <section className="position" aria-label="Open Position">
      <p className="position__label">Open Position</p>
      {/* The Stop shown is the one the exchange will fire on, not the one the
          Plan was sized at — a stale Stop on a live Position is the reading a
          trader would act on. */}
      <PlanFigures plan={plan} stopPrice={position.stopPrice} />
      <p className="figures__detail">
        <span>Liquidation {plan.liquidationPrice}</span>
        <span>Opened {formatWhen(position.openedAt)}</span>
      </p>
      {/* Once it has moved, where it started is worth saying out loud: it is
          no longer the Stop that will fire, but it is still the one this Trade
          gets measured against however far the other is trailed (ADR-0001). */}
      {position.stopMoves.length > 0 && (
        <p className="position__stops">
          Original Stop {plan.stopPrice} — 1R stays fixed to it
        </p>
      )}
      {/* On the live Position too: if this trade was taken past a Rule, that
          is worth reading while it is still costing something. */}
      <Violations violations={plan.violations} />
      <MoveStopForm position={position} onMove={onMoveStop} />
      <ClosePositionForm position={position} clock={clock} onClose={onClose} />
    </section>
  );
}
