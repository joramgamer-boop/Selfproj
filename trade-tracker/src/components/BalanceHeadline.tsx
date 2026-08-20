import { formatDrawdown, formatMoney } from '../format';

interface BalanceHeadlineProps {
  balance: number;
  peakBalance: number;
  /** A share of Peak Balance, as the fold worked it out. */
  drawdown: number;
}

/**
 * Where the account stands. All three figures are derived from the Ledger —
 * there is nothing here to type into.
 *
 * The peak and the fall from it sit under the Balance rather than behind a tap
 * because the tripwire is meant to be seen coming. A trader who only meets the
 * 20% Drawdown as a block on the Plan screen has already decided to trade; one
 * who watched it go 12%, 17%, 19% has been given the chance to stop first.
 */
export default function BalanceHeadline({
  balance,
  peakBalance,
  drawdown,
}: BalanceHeadlineProps) {
  return (
    <section className="balance" aria-label="Balance">
      <p className="balance__label">Balance</p>
      <p className="balance__amount">{formatMoney(balance)}</p>
      <p className="balance__note">Derived from the Ledger.</p>
      <dl className="balance__account">
        <div className="balance__figure">
          <dt>Peak Balance</dt>
          <dd aria-label="Peak Balance">{formatMoney(peakBalance)}</dd>
        </div>
        <div className="balance__figure">
          <dt>Drawdown</dt>
          {/* Named as a fall rather than coloured as one: a 3% Drawdown is an
              ordinary Tuesday, and an alarm that is always on is not an alarm. */}
          <dd aria-label="Drawdown">{formatDrawdown(drawdown)}</dd>
        </div>
      </dl>
    </section>
  );
}
