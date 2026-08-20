import { formatMoney, formatWhen } from '../format';
import { ruleName } from '../core/rules';
import type { LedgerEntry } from '../core/state';

export default function LedgerList({ entries }: { entries: readonly LedgerEntry[] }) {
  return (
    <section className="ledger" aria-labelledby="ledger-heading">
      <h2 className="ledger__heading" id="ledger-heading">
        Ledger
      </h2>
      {entries.length === 0 ? (
        <p className="ledger__empty">Nothing recorded yet.</p>
      ) : (
        <ul className="ledger__entries">
          {/* Newest first: the last thing recorded is the thing being checked. */}
          {[...entries].reverse().map((entry) => (
            <li className="ledger__entry" key={entry.seq} aria-label="Ledger entry">
              <span className="ledger__kind">{entry.kind}</span>
              <span className="ledger__when">{formatWhen(entry.at)}</span>
              <span className="ledger__amount">{formatMoney(entry.amount)}</span>
              <span className="ledger__running">{formatMoney(entry.balanceAfter)}</span>
              {/* Permanent, like a Violation and for the same reason: the row
                  keeps what the Rules said at the time, so a Withdrawal that
                  took the base still says so once the Balance has recovered. */}
              {entry.warnings.map((ruleId) => (
                <span className="ledger__flag" key={ruleId}>
                  {ruleName(ruleId)}
                </span>
              ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
