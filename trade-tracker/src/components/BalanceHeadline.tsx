import { formatMoney } from '../format';

/** Balance is derived from the Ledger — there is nothing here to type into. */
export default function BalanceHeadline({ balance }: { balance: number }) {
  return (
    <section className="balance" aria-label="Balance">
      <p className="balance__label">Balance</p>
      <p className="balance__amount">{formatMoney(balance)}</p>
      <p className="balance__note">Derived from the Ledger.</p>
    </section>
  );
}
