import { ruleName, type RuleVerdict } from '../core/rules';

/**
 * What the Rules have to say about something they cannot stop. It is shaped
 * like the Override block — its own panel, the Rule named, the Rule's own
 * words underneath — and then offers nothing to press.
 *
 * That absence is the whole difference between a block and a warning, said in
 * layout: there is no button here because there is nothing to get past. The
 * money has already moved, and the app's only remaining power is to say so.
 *
 * The colour differs from a block deliberately. A Rule that stopped you and a
 * Rule reporting what already happened must not read as the same event — if
 * everything is alarm-coloured, the alarm stops meaning anything, and the one
 * screen that can still stop a trade loses its only signal.
 */
export default function Warnings({ verdicts }: { verdicts: readonly RuleVerdict[] }) {
  if (verdicts.length === 0) return null;

  return (
    // Announced politely rather than as an alert: this updates on every
    // keystroke while the amount is being typed, and an assertive live region
    // would interrupt the typing it is commenting on.
    <section className="warning" role="status" aria-label="Warnings">
      <p className="warning__label">Against your Rules</p>
      {verdicts.map((verdict) => (
        <div key={verdict.ruleId} className="warning__rule">
          <span className="warning__rule-name">{ruleName(verdict.ruleId)}</span>
          <span className="warning__rule-why">{verdict.explanation}</span>
        </div>
      ))}
      <p className="warning__price">
        Recorded on the row either way — the Ledger never refuses what happened.
      </p>
    </section>
  );
}
