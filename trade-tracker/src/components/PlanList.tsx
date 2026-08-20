import type { AbandonPlan, OpenPosition } from '../core/commands';
import type { Plan } from '../core/state';
import { formatDirection, formatRiskPercent, formatWhen } from '../format';
import type { RecordResult } from '../useTradeTracker';
import { useSubmission } from '../useSubmission';
import AbandonReasons from './AbandonReasons';
import PlanFigures from './PlanFigures';
import Override from './Override';
import RiskFlag from './RiskFlag';
import Violations from './Violations';

interface PlanListProps {
  plans: readonly Plan[];
  onOpen: (command: OpenPosition) => Promise<RecordResult>;
  onAbandon: (command: AbandonPlan) => Promise<RecordResult>;
}

/**
 * The Plans still waiting on a decision — take it, or say why not. Which those
 * are is `plansAwaitingADecision`'s to say; this renders what it is handed.
 */
export default function PlanList({ plans, onOpen, onAbandon }: PlanListProps) {
  return (
    <section className="plans" aria-labelledby="plans-heading">
      <h2 className="plans__heading" id="plans-heading">
        Plans
      </h2>
      {plans.length === 0 ? (
        <p className="plans__empty">No Plan waiting to be taken.</p>
      ) : (
        <ul className="plans__list">
          {/* Newest first: the Plan being acted on is the one just sized. */}
          {[...plans].reverse().map((plan) => (
            <PlanRow key={plan.id} plan={plan} onOpen={onOpen} onAbandon={onAbandon} />
          ))}
        </ul>
      )}
    </section>
  );
}

interface PlanRowProps {
  plan: Plan;
  onOpen: PlanListProps['onOpen'];
  onAbandon: PlanListProps['onAbandon'];
}

function PlanRow({ plan, onOpen, onAbandon }: PlanRowProps) {
  const { saving, rejection, block, reason, setReason, onSubmit } = useSubmission(
    (override) => onOpen({ type: 'OpenPosition', planId: plan.id, override }),
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
      <RiskFlag aboveDefaultRisk={plan.aboveDefaultRisk} />
      <Violations violations={plan.violations} />
      {/* A form rather than a bare button, so taking a Plan live gets the same
          one-tap-one-record guard everything else that writes to the log has.
          The button stays on offer while another Position is live: the Rule
          against that is the core's to give, along with the way past it. */}
      <form className="plan__open" onSubmit={onSubmit}>
        <Override
          block={block}
          label="Open as Position"
          className="plan__take"
          saving={saving}
          id={`open-override-${plan.id}`}
          reason={reason}
          onReason={setReason}
        />
        {rejection && (
          <p className="plan__rejection" role="alert">
            {rejection}
          </p>
        )}
      </form>
      {/* Beneath taking it, and quieter: skipping is the right call often
          enough to be one tap away, and never the one being encouraged. */}
      <AbandonReasons planId={plan.id} onAbandon={onAbandon} />
    </li>
  );
}
