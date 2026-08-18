import { ruleName, type Violation } from '../core/rules';

/**
 * The Rules this Plan was put through anyway, and what was typed at the time.
 * It reads the same wherever the Plan appears — still a Plan, live as a
 * Position, closed as a Trade — because a Violation is permanent and the
 * point of it is that it cannot be reviewed away.
 */
export default function Violations({ violations }: { violations: readonly Violation[] }) {
  if (violations.length === 0) return null;

  return (
    <ul className="violations" aria-label="Violations">
      {violations.map((violation, index) => (
        // Indexed because one Rule can be overridden more than once in a
        // Plan's life, and the log keeps every one of them.
        <li key={`${violation.ruleId}-${index}`} className="violation">
          <span className="violation__rule">Violation — {ruleName(violation.ruleId)}</span>
          <span className="violation__reason">{violation.reason}</span>
        </li>
      ))}
    </ul>
  );
}
