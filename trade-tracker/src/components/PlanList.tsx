import type { OpenPosition } from '../core/commands';
import type { Plan } from '../core/state';
import { formatDirection, formatRiskPercent, formatWhen } from '../format';
import type { RecordResult } from '../useTradeTracker';
import { useSubmission } from '../useSubmission';
import PlanFigures from './PlanFigures';

/** How a Plan that is no longer merely a Plan reads on its row. */
const outcomes: Partial<Record<Plan['status'], string>> = {
  open: 'Live as a Position',
  closed: 'Closed as a Trade',
};

interface PlanListProps {
  plans: readonly Plan[];
  onOpen: (command: OpenPosition) => Promise<RecordResult>;
}

/** Every Plan the log holds, whatever became of it. */
export default function PlanList({ plans, onOpen }: PlanListProps) {
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
            <PlanRow key={plan.id} plan={plan} onOpen={onOpen} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PlanRow({ plan, onOpen }: { plan: Plan; onOpen: PlanListProps['onOpen'] }) {
  const { saving, rejection, onSubmit } = useSubmission(
    () => onOpen({ type: 'OpenPosition', planId: plan.id }),
    () => {},
  );

  return (
    <li className="plan" aria-label={'Plan ' + formatDirection(plan.direction)}>
      <PlanFigures plan={plan} />
      <p className="figures__detail">
        <span>Risk {formatRiskPercent(plan.riskFraction)}</span>
        <span>Liquidation {plan.liquidationPrice}</span>
        <span>{formatWhen(plan.at)}</span>
      </p>
      {plan.aboveDefaultRisk && <p className="plan__flag">Above default Risk</p>}
      {outcomes[plan.status] && <p className="plan__outcome">{outcomes[plan.status]}</p>}
      {plan.status === 'planned' && (
        // A form rather than a bare button, so taking a Plan live gets the same
        // one-tap-one-record guard everything else that writes to the log has.
        <form className="plan__open" onSubmit={onSubmit}>
          <button className="plan__take" type="submit" disabled={saving}>
            Open as Position
          </button>
          {rejection && (
            <p className="plan__rejection" role="alert">
              {rejection}
            </p>
          )}
        </form>
      )}
    </li>
  );
}
