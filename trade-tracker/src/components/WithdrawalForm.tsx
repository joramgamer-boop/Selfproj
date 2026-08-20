import { useState } from 'react';
import type { RuleVerdict } from '../core/rules';
import type { RecordResult } from '../useTradeTracker';
import { useSubmission } from '../useSubmission';
import Warnings from './Warnings';

interface WithdrawalFormProps {
  /**
   * What the Rules make of a Withdrawal of this size. A function rather than a
   * list, because the answer changes with every keystroke — and it is the
   * core's answer, asked for by the screen rather than worked out on it.
   */
  warningsFor: (amount: number) => readonly RuleVerdict[];
  onRecord: (amount: number) => Promise<RecordResult>;
}

/**
 * Money going back out. The form that cannot be refused: the Rules about a
 * Withdrawal act after the fact, so what they produce here is a warning and a
 * flag on the Ledger row — never a block, and never an Override to type past,
 * because there is nothing standing in the way to get past.
 *
 * The warning shows as the amount is typed rather than after the button, which
 * is the only moment it can still change anything. It is not a confirmation
 * step: the button says the same thing and does the same thing whether the
 * warning is up or not.
 */
export default function WithdrawalForm({ warningsFor, onRecord }: WithdrawalFormProps) {
  const [amount, setAmount] = useState('');
  const { saving, rejection, onSubmit } = useSubmission(
    () => onRecord(Number(amount)),
    () => setAmount(''),
  );

  return (
    <form className="cash" onSubmit={onSubmit} noValidate>
      <label className="cash__label" htmlFor="withdrawal-amount">
        Withdrawal amount
      </label>
      <div className="cash__row">
        <input
          id="withdrawal-amount"
          className="cash__input"
          type="number"
          inputMode="decimal"
          step="any"
          placeholder="0.00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <button className="cash__submit" type="submit" disabled={saving}>
          Record Withdrawal
        </button>
      </div>
      <Warnings verdicts={warningsFor(Number(amount))} />
      {rejection && (
        <p className="cash__rejection" role="alert">
          {rejection}
        </p>
      )}
    </form>
  );
}
