import type { Clock } from './clock';
import type { TradeTrackerEvent } from './events';
import type { IdSource } from './ids';
import { isRecordableAmount, toCents } from './money';
import type { PlanInputs } from './plan';
import { isPlannableRiskFraction, roundRiskFraction } from './risk';
import { sizeNewPlan } from './sizing';
import type { DerivedState } from './state';

export interface RecordDeposit {
  readonly type: 'RecordDeposit';
  readonly amount: number;
}

/** Everything the trader types on the Plan screen. Notional is not offered. */
export interface CreatePlan extends PlanInputs {
  readonly type: 'CreatePlan';
}

export interface SetRiskDefault {
  readonly type: 'SetRiskDefault';
  readonly riskFraction: number;
}

export type Command = RecordDeposit | CreatePlan | SetRiskDefault;

/**
 * What evaluating a command produced: the events to append, or a refusal.
 * Rule verdicts — blocking but overridable — join this union later.
 */
export type Evaluation =
  | { readonly outcome: 'append'; readonly events: readonly TradeTrackerEvent[] }
  | { readonly outcome: 'rejected'; readonly reason: string };

/** What a command needs from outside the log in order to stamp its events. */
export interface CommandContext {
  readonly clock: Clock;
  readonly ids: IdSource;
}

/**
 * Evaluation is separate from application: this decides what a command means
 * against the current derived state and returns events, and appending them is
 * somebody else's job. The UI renders the outcome; it never decides it.
 */
export function evaluate(
  state: DerivedState,
  command: Command,
  context: CommandContext,
): Evaluation {
  switch (command.type) {
    case 'RecordDeposit':
      return evaluateRecordDeposit(command, context);
    case 'CreatePlan':
      return evaluateCreatePlan(state, command, context);
    case 'SetRiskDefault':
      return evaluateSetRiskDefault(command, context);
  }
}

function evaluateRecordDeposit(command: RecordDeposit, { clock }: CommandContext): Evaluation {
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

function evaluateCreatePlan(
  state: DerivedState,
  command: CreatePlan,
  { clock, ids }: CommandContext,
): Evaluation {
  const riskFraction = roundRiskFraction(command.riskFraction);
  // The same gate the live preview went through, so what gets written is the
  // size the trader was looking at when they committed.
  const sizing = sizeNewPlan(state.balance, { ...command, riskFraction });
  if (sizing.outcome !== 'sized') {
    return { outcome: 'rejected', reason: sizing.reason };
  }

  return {
    outcome: 'append',
    events: [
      {
        type: 'PlanCreated',
        at: clock.now().toISOString(),
        id: ids.next(),
        direction: command.direction,
        entryPrice: command.entryPrice,
        stopPrice: command.stopPrice,
        leverage: command.leverage,
        liquidationPrice: command.liquidationPrice,
        riskFraction,
      },
    ],
  };
}

function evaluateSetRiskDefault(command: SetRiskDefault, { clock }: CommandContext): Evaluation {
  const riskFraction = roundRiskFraction(command.riskFraction);
  if (!isPlannableRiskFraction(riskFraction)) {
    return { outcome: 'rejected', reason: 'Risk must be between 2% and 3% of Balance.' };
  }

  return {
    outcome: 'append',
    events: [{ type: 'RiskDefaultChanged', at: clock.now().toISOString(), riskFraction }],
  };
}
