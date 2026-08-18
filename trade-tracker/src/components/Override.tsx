import { ruleName, type RuleVerdict } from '../core/rules';

interface OverrideProps {
  /** The Rules standing in the way, or null while none is. */
  block: readonly RuleVerdict[] | null;
  /** What the button says when nothing is blocking. */
  label: string;
  className: string;
  saving: boolean;
  /** Distinguishes this form's reason field from any other on the page. */
  id: string;
  reason: string;
  onReason: (reason: string) => void;
}

/**
 * What the app does instead of stopping you: it names the Rule, says why the
 * Rule exists, and asks for a reason. Typing one and pressing the same button
 * again puts the trade through — with a Violation attached to it for good.
 *
 * The button belongs here rather than in the forms because it is the same
 * button in both states, only relabelled. Two buttons would offer a choice
 * between obeying and proceeding, and the app does not have an opinion to
 * offer at that point: it has already said everything it knows.
 *
 * Nothing here decides whether a Rule is broken, and nothing here decides
 * whether the reason is good enough. Both are the core's, and the verdicts
 * render exactly as the core gave them.
 */
export default function Override({
  block,
  label,
  className,
  saving,
  id,
  reason,
  onReason,
}: OverrideProps) {
  return (
    <>
      {block && (
        <section className="block" role="alert" aria-label="Blocked by a Rule">
          <p className="block__label">
            {block.length === 1 ? 'Blocked' : 'Blocked by your Rules'}
          </p>
          <ul className="block__rules">
            {block.map((verdict) => (
              <li key={verdict.ruleId} className="block__rule">
                <span className="block__rule-name">{ruleName(verdict.ruleId)}</span>
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
              whole reason the button is still there. */}
          <p className="block__price">Recorded on the row as a Violation, permanently.</p>
        </section>
      )}
      <button className={className} type="submit" disabled={saving}>
        {block ? `${label} anyway` : label}
      </button>
    </>
  );
}
