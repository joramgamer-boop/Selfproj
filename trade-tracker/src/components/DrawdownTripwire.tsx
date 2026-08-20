import { formatDrawdown } from '../format';
import type { RecordResult } from '../useTradeTracker';
import { useSubmission } from '../useSubmission';

interface DrawdownTripwireProps {
  drawdown: number;
  onAcknowledge: () => Promise<RecordResult>;
}

/**
 * The tripwire, once it has fired. It sits above the Plan screen rather than
 * inside it because the pause is the point: meeting this as a block halfway
 * through sizing a trade is meeting it after the decision to trade was made.
 *
 * Acknowledging is a recorded event, not a dismissal. How often the tripwire
 * fires and how fast it gets waved through is itself the record of whether the
 * pause was ever really taken — which is why there is nothing here that closes
 * the banner without writing something down.
 *
 * It says what the pause is and leaves the argument for it to the Rule, which
 * the sizer renders in the Rule's own words if a Plan is attempted anyway.
 * Saying it twice would only let the two copies drift.
 */
export default function DrawdownTripwire({ drawdown, onAcknowledge }: DrawdownTripwireProps) {
  // The same guard every other form here has, and load-bearing for the same
  // reason: a second tap while the first is saving would put two reviews of
  // one drawdown in the log.
  const { saving, rejection, onSubmit } = useSubmission(onAcknowledge, () => {});

  return (
    <form className="tripwire" onSubmit={onSubmit} aria-label="Drawdown tripwire" noValidate>
      <p className="tripwire__label" role="alert">
        Down {formatDrawdown(drawdown)} from your Peak Balance
      </p>
      <p className="tripwire__why">
        New Plans are paused until you have read the log.
      </p>
      <button className="tripwire__ack" type="submit" disabled={saving}>
        I have reviewed the log
      </button>
      {/* Said plainly, because it is what the button costs: the pause is data
          about the pause, and a review that vanished would tell nobody
          anything. */}
      <p className="tripwire__price">Recorded in the log, with the time you did it.</p>
      {rejection && (
        <p className="tripwire__rejection" role="alert">
          {rejection}
        </p>
      )}
    </form>
  );
}
