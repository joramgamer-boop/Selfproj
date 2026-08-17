import type { Clock } from './clock';
import type { TradeTrackerEvent } from './events';
import { isRecordableAmount, toCents } from './money';
import type { DerivedState } from './state';

export interface RecordDeposit {
  readonly type: 'RecordDeposit';
  readonly amount: number;
}

export type Command = RecordDeposit;

/**
 * What evaluating a command produced: the events to append, or a refusal.
 * Rule verdicts — blocking but overridable — join this union later.
 */
export type Evaluation =
  | { readonly outcome: 'append'; readonly events: readonly TradeTrackerEvent[] }
  | { readonly outcome: 'rejected'; readonly reason: string };

/**
 * Evaluation is separate from application: this decides what a command means
 * against the current derived state and returns events, and appending them is
 * somebody else's job. The UI renders the outcome; it never decides it.
 */
export function evaluate(_state: DerivedState, command: Command, clock: Clock): Evaluation {
  switch (command.type) {
    case 'RecordDeposit':
      return evaluateRecordDeposit(command, clock);
  }
}

function evaluateRecordDeposit(command: RecordDeposit, clock: Clock): Evaluation {
  if (!isRecordableAmount(command.amount)) {
    return { outcome: 'rejected', reason: 'A Deposit must be an amount greater than zero.' };
  }

  return {
    outcome: 'append',
    events: [
      {
        type: 'Deposit',
        at: clock.now().toISOString(),
        // Recorded to the cent, so the Ledger's entries always add up to the
        // Balance folded from them.
        amount: toCents(command.amount),
      },
    ],
  };
}
