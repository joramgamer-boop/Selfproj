import { useState } from 'react';
import type { RecordResult } from '../useTradeTracker';
import { useSubmission } from '../useSubmission';

interface DepositFormProps {
  onRecord: (amount: number) => Promise<RecordResult>;
}

/**
 * Money going in. Nothing judges a Deposit — feeding the base with real
 * capital is the framework's own advice — so this is the plain form, and its
 * sibling that takes money back out is the one with something to say.
 */
export default function DepositForm({ onRecord }: DepositFormProps) {
  const [amount, setAmount] = useState('');
  // The core decides whether the amount is recordable; this only parses the
  // field and shows what came back.
  const { saving, rejection, onSubmit } = useSubmission(
    () => onRecord(Number(amount)),
    () => setAmount(''),
  );

  return (
    <form className="cash" onSubmit={onSubmit} noValidate>
      <label className="cash__label" htmlFor="deposit-amount">
        Deposit amount
      </label>
      <div className="cash__row">
        <input
          id="deposit-amount"
          className="cash__input"
          type="number"
          inputMode="decimal"
          step="any"
          placeholder="0.00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        {/* One tap, one Deposit: a second tap while the first is still saving
            would size off a Balance the Ledger has not caught up with. */}
        <button className="cash__submit" type="submit" disabled={saving}>
          Record Deposit
        </button>
      </div>
      {rejection && (
        <p className="cash__rejection" role="alert">
          {rejection}
        </p>
      )}
    </form>
  );
}
