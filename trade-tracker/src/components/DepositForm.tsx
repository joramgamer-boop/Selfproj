import { useState } from 'react';
import type { RecordResult } from '../useTradeTracker';
import { useSubmission } from '../useSubmission';

interface DepositFormProps {
  onRecord: (amount: number) => Promise<RecordResult>;
}

export default function DepositForm({ onRecord }: DepositFormProps) {
  const [amount, setAmount] = useState('');
  // The core decides whether the amount is recordable; this only parses the
  // field and shows what came back.
  const { saving, rejection, onSubmit } = useSubmission(
    () => onRecord(Number(amount)),
    () => setAmount(''),
  );

  return (
    <form className="deposit" onSubmit={onSubmit} noValidate>
      <label className="deposit__label" htmlFor="deposit-amount">
        Deposit amount
      </label>
      <div className="deposit__row">
        <input
          id="deposit-amount"
          className="deposit__input"
          type="number"
          inputMode="decimal"
          step="any"
          placeholder="0.00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        {/* One tap, one Deposit: a second tap while the first is still saving
            would size off a Balance the Ledger has not caught up with. */}
        <button className="deposit__submit" type="submit" disabled={saving}>
          Record Deposit
        </button>
      </div>
      {rejection && (
        <p className="deposit__rejection" role="alert">
          {rejection}
        </p>
      )}
    </form>
  );
}
