import type { RuleVerdict } from '../core/rules';

interface RuleBlockProps {
  verdicts: readonly RuleVerdict[];
  /** Distinguishes this form's reason field from any other on the page. */
  id: string;
  reason: string;
  onReason: (reason: string) => void;
}

/**
 * What the app does instead of stopping you: it names the Rule, says why it
 * exists, and asks for a reason. Typing one and submitting again puts the
 * trade through — with a Violation attached to it for good.
 *
 * The verdicts are rendered exactly as the core gave them. Nothing here
 * decides whether a Rule is broken, and nothing here decides whether the
 * reason is good enough.
 */
export default function RuleBlock({ verdicts, id, reason, onReason }: RuleBlockProps) {
  return (
    <section className="block" role="alert" aria-label="Blocked by a Rule">
      <p className="block__label">{verdicts.length === 1 ? 'Blocked' : 'Blocked by your Rules'}</p>
      <ul className="block__rules">
        {verdicts.map((verdict) => (
          <li key={verdict.ruleId} className="block__rule">
            <span className="block__rule-name">{verdict.rule}</span>
            <span className="block__rule-why">{verdict.explanation}</span>
          </li>
        ))}
      </ul>
      <p className="field">
        <label className="field__label" htmlFor={id}>
          Why are you doing it anyway?
        </label>
        <textarea
          id={id}
          className="field__input block__reason"
          rows={2}
          value={reason}
          onChange={(event) => onReason(event.target.value)}
        />
      </p>
      {/* Said plainly, because it is the price of the button below and the
          whole reason the button exists. */}
      <p className="block__price">Recorded on the row as a Violation, permanently.</p>
    </section>
  );
}
