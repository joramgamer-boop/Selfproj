import { isInstant, type Clock } from './clock';
import type { TradeTrackerEvent } from './events';
import type { IdSource } from './ids';
import { isRecordableAmount, toCents } from './money';
import { isAbandonReason, type PlanInputs } from './plan';
import { isPlannableRiskFraction, roundRiskFraction } from './risk';
import { judge, type RuleVerdict, type Violation } from './rules';
import { closeOut } from './settlement';
import { sizeNewPlan } from './sizing';
import type { DerivedState, Position } from './state';
import type { ProposedClose } from './trade';

/**
 * Proceeding past a blocking Rule by typing why. Always on offer, because the
 * app has no power over the exchange: a Rule that could never be broken would
 * be bypassed by simply not opening the app, and an unlogged trade is worse
 * than a logged Violation — it also corrupts every Balance derived after it.
 */
export interface Override {
  readonly reason: string;
}

/** A command the trader can insist on. Absent, the Rules have the last word. */
interface Overridable {
  readonly override?: Override | null;
}

export interface RecordDeposit {
  readonly type: 'RecordDeposit';
  readonly amount: number;
}

/** Everything the trader types on the Plan screen. Notional is not offered. */
export interface CreatePlan extends PlanInputs, Overridable {
  readonly type: 'CreatePlan';
}

/**
 * Skipping a Plan that was sized. The reason arrives as the screen offered
 * it; deciding whether it is one of the four is the core's job, exactly as it
 * is for an Exit Reason.
 */
export interface AbandonPlan {
  readonly type: 'AbandonPlan';
  readonly planId: string;
  readonly reason: string;
}

/** Taking a Plan live. Nothing to type: the Plan already holds the figures. */
export interface OpenPosition extends Overridable {
  readonly type: 'OpenPosition';
  readonly planId: string;
}

/** What the trader types when a Position closes. */
export interface ClosePosition extends ProposedClose {
  readonly type: 'ClosePosition';
  readonly planId: string;
  /** Null unless the trader corrected the stamp the clock made. */
  readonly openedAt: string | null;
  readonly closedAt: string | null;
}

export interface SetRiskDefault {
  readonly type: 'SetRiskDefault';
  readonly riskFraction: number;
}

export type Command =
  | RecordDeposit
  | CreatePlan
  | AbandonPlan
  | OpenPosition
  | ClosePosition
  | SetRiskDefault;

/**
 * What evaluating a command produced: the events to append, the Rules that
 * block it, or a flat refusal.
 *
 * The middle one is the interesting one. A block is the app's whole authority
 * and the whole of it — the trader can come back with an Override and the
 * command goes through carrying a Violation. A rejection is different: it is
 * a command that could not be carried out at all, and no reason typed into it
 * would produce anything to record.
 */
export type Evaluation =
  | { readonly outcome: 'append'; readonly events: readonly TradeTrackerEvent[] }
  | { readonly outcome: 'blocked'; readonly verdicts: readonly RuleVerdict[] }
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
    case 'AbandonPlan':
      return evaluateAbandonPlan(state, command, context);
    case 'OpenPosition':
      return evaluateOpenPosition(state, command, context);
    case 'ClosePosition':
      return evaluateClosePosition(state, command, context);
    case 'SetRiskDefault':
      return evaluateSetRiskDefault(command, context);
  }
}

/**
 * What the Rules say about a command, once the Override on it — if there is
 * one — has been taken into account. Clearing carries the Violations to write
 * onto the resulting event, which is empty unless something was overridden.
 */
type RuleOutcome =
  | { readonly outcome: 'clear'; readonly violations: readonly Violation[] }
  | { readonly outcome: 'blocked'; readonly verdicts: readonly RuleVerdict[] }
  | { readonly outcome: 'rejected'; readonly reason: string };

function applyRules(state: DerivedState, command: Command): RuleOutcome {
  const verdicts = judge(state, command);
  if (verdicts.length === 0) return { outcome: 'clear', violations: [] };

  // A Rule no reason can answer refuses outright rather than blocking. It
  // would leave nothing to attach the reason to, so a block would offer a way
  // through that does not exist — the one thing worse than a block, because
  // the trader spends the moment before a trade typing into a dead end.
  const unanswerable = verdicts.find((verdict) => !verdict.overridable);
  if (unanswerable) return { outcome: 'rejected', reason: unanswerable.explanation };

  const override = 'override' in command ? (command.override ?? null) : null;
  if (!override) return { outcome: 'blocked', verdicts };

  // An Override with nothing typed into it is not a record of anything, and a
  // Violation nobody can read later is the same as no Rule at all.
  const reason = override.reason.trim();
  if (reason === '') {
    return { outcome: 'rejected', reason: 'Say why you are proceeding — an Override is a record.' };
  }

  // One reason answers every Rule the command broke, because the trader
  // proceeded once. Each Rule gets its own Violation so compliance stays
  // countable per Rule.
  return { outcome: 'clear', violations: verdicts.map((verdict) => ({ ruleId: verdict.ruleId, reason })) };
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
  const proposed = { ...command, riskFraction };

  // The Rules get first word, so what the trader reads is the Rule they broke
  // rather than the arithmetic downstream of it.
  const ruled = applyRules(state, proposed);
  if (ruled.outcome !== 'clear') return ruled;

  // The same gate the live preview went through, so what gets written is the
  // size the trader was looking at when they committed. An Override does not
  // reach this: a Plan the app cannot solve a size for has nothing to record.
  const sizing = sizeNewPlan(state.balance, proposed);
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
        violations: ruled.violations,
      },
    ],
  };
}

/**
 * Why this Plan can no longer be acted on, or null while it still can be.
 * Taking a Plan live and skipping it want the same thing of it — a Plan on the
 * record that is still only a Plan — and neither answer is a Rule to argue
 * with: a Plan that has already ended has nothing left for either command to
 * record, so no reason typed into it would produce an event.
 */
function alreadyEnded(state: DerivedState, planId: string): Evaluation | null {
  const plan = state.plans.find((candidate) => candidate.id === planId);
  if (!plan) return { outcome: 'rejected', reason: 'That Plan is not on the record.' };

  switch (plan.status) {
    case 'planned':
      return null;
    case 'open':
      // A live Position is closed, never skipped: money is on the exchange,
      // and a skip that could swallow it would take a real Trade out of the
      // log.
      return { outcome: 'rejected', reason: 'That Plan is already live as a Position.' };
    case 'closed':
      return { outcome: 'rejected', reason: 'That Plan has already closed as a Trade.' };
    case 'abandoned':
      return { outcome: 'rejected', reason: 'That Plan was abandoned. Size it again if it is back on.' };
  }
}

/**
 * Recording a skip. No Rule judges this one and none could: there is nothing
 * to block, and refusing to record a trade that was *not* taken would leave
 * the log claiming the setup never happened. The only thing to decide is
 * whether the Plan is still a Plan and the reason is one of the four.
 */
function evaluateAbandonPlan(
  state: DerivedState,
  command: AbandonPlan,
  { clock }: CommandContext,
): Evaluation {
  const ended = alreadyEnded(state, command.planId);
  if (ended) return ended;

  // Free text would make the skips uncountable, and "price ran away" only
  // becomes evidence of entry lag once every instance of it says the same
  // words.
  if (!isAbandonReason(command.reason)) {
    return { outcome: 'rejected', reason: 'Pick one of the four reasons — a skip is data, not a note.' };
  }

  return {
    outcome: 'append',
    events: [
      {
        type: 'PlanAbandoned',
        at: clock.now().toISOString(),
        planId: command.planId,
        reason: command.reason,
      },
    ],
  };
}

function evaluateOpenPosition(
  state: DerivedState,
  command: OpenPosition,
  { clock }: CommandContext,
): Evaluation {
  const ended = alreadyEnded(state, command.planId);
  if (ended) return ended;

  // A second Position while one is live is the Rule's to judge, and only after
  // the refusals above: reopening the *same* Plan is not a Rule to argue with,
  // it is a tap that means nothing, and it must not be offered an Override.
  const ruled = applyRules(state, command);
  if (ruled.outcome !== 'clear') return ruled;

  return {
    outcome: 'append',
    events: [
      {
        type: 'PositionOpened',
        at: clock.now().toISOString(),
        planId: command.planId,
        violations: ruled.violations,
      },
    ],
  };
}

function evaluateClosePosition(
  state: DerivedState,
  command: ClosePosition,
  { clock }: CommandContext,
): Evaluation {
  const position = state.openPositions.find((open) => open.plan.id === command.planId);
  if (!position) {
    return { outcome: 'rejected', reason: 'There is no Position open on that Plan.' };
  }

  const close = closeOut(position.plan, command);
  if (close.outcome !== 'recordable') return { outcome: 'rejected', reason: close.reason };

  const hold = holdOf(position, command, clock.now().toISOString());
  if (hold.outcome !== 'held') return { outcome: 'rejected', reason: hold.reason };

  return {
    outcome: 'append',
    events: [
      {
        type: 'PositionClosed',
        at: hold.at,
        planId: command.planId,
        openedAt: hold.openedAt,
        closedAt: hold.closedAt,
        ...close.closing,
      },
    ],
  };
}

type Hold =
  | { readonly outcome: 'held'; readonly at: string; readonly openedAt: string; readonly closedAt: string }
  | { readonly outcome: 'impossible'; readonly reason: string };

/**
 * When the trade actually ran, as against when it was written down. Both ends
 * default to the stamps and are the trader's to correct: logging a close two
 * hours late must not fabricate a two-hour hold.
 */
function holdOf(position: Position, command: ClosePosition, at: string): Hold {
  const openedAt = command.openedAt ?? position.openedAt;
  const closedAt = command.closedAt ?? at;

  if (!isInstant(openedAt) || !isInstant(closedAt)) {
    return { outcome: 'impossible', reason: 'That is not a time we can record.' };
  }
  if (Date.parse(closedAt) < Date.parse(openedAt)) {
    return { outcome: 'impossible', reason: 'A Position cannot close before it opened.' };
  }

  return { outcome: 'held', at, openedAt, closedAt };
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
