import { DRAWDOWN_TRIPWIRE, drawdownPercent, hasDoubled } from './account';
import type { Command } from './commands';
import { UNBACKED_TRADE_LIMIT } from './export';
import { isPrice, toCents } from './money';
import type { DerivedState } from './state';

/**
 * The Rules the app enforces, modelled as data: an id, a name, a verdict
 * function over derived state and the proposed command, and a classification.
 *
 * Nothing about a Rule lives in a component. The UI renders the verdicts this
 * module returns and never decides one — a Rule check that leaked into the UI
 * would be untestable at the primary seam.
 */

export const RULE_IDS = [
  'stop-required',
  'drawdown-review',
  'back-up-the-log',
  'liquidation-buffer',
  'one-position-at-a-time',
  'stop-never-widens',
  'withdrawal-never-touches-the-base',
  'withdrawal-waits-for-the-double',
] as const;

/** Named on every Violation, so the log stores an id rather than prose. */
export type RuleId = (typeof RULE_IDS)[number];

/**
 * When a Rule gets to act. Pre-fact Rules block a command before it happens
 * and can be overridden by typing a reason. Post-fact Rules can only warn,
 * because the Ledger must record what already happened.
 *
 * The asymmetry is the whole design. The Drawdown tripwire acts before a
 * trade, so it can genuinely stop one. A Withdrawal is money that has already
 * left, and refusing to record it would not put it back — it would only leave
 * every Position sized after it solved from a Balance that is too high.
 */
export type RuleTiming = 'pre-fact' | 'post-fact';

export interface Rule {
  readonly id: RuleId;
  /** How the block names itself on screen. */
  readonly name: string;
  readonly timing: RuleTiming;
  /**
   * Whether typing a reason gets you past it. Almost always true, and that is
   * the app's entire design: it has no power over the exchange, so a Rule that
   * could never be broken would be bypassed by not opening the app at all.
   *
   * False only where breaking the Rule would leave nothing to record — there
   * is then no event for the reason to be attached to, and offering the box
   * would be a dead end rather than a way through. Exactly one Rule is like
   * that, and the reason it is sits on the Rule itself.
   */
  readonly overridable: boolean;
  /** Why this command breaks the Rule, or null when it does not. */
  verdict(state: DerivedState, command: Command): string | null;
}

/**
 * What a Rule had to say about the command that was proposed. It names the
 * Rule by id only, for the same reason a Violation does: the id is the Rule,
 * and `ruleName` is the one place that turns one into words.
 */
export interface RuleVerdict {
  readonly ruleId: RuleId;
  /** Whether this verdict can stop the command or only comment on it. */
  readonly timing: RuleTiming;
  readonly overridable: boolean;
  readonly explanation: string;
}

/**
 * A permanent flag recording that a Rule was overridden, with the reason typed
 * at the time. Violations are data: they make compliance a column that can be
 * sorted alongside Expectancy, which is the whole reason overriding is allowed.
 */
export interface Violation {
  readonly ruleId: RuleId;
  readonly reason: string;
}

/**
 * A Plan with no Stop has no 1R, and a result that cannot be denominated in
 * 1R cannot be compared with any other result in the log. The Stop is also the
 * only input Notional is solved from — `Risk ÷ Stop distance` has no answer
 * without one — so this is the Rule no Override can get past. It refuses
 * rather than blocking, because a Plan that cannot be sized is not a Plan that
 * was stopped: it is one that was never there to record.
 */
const stopRequired: Rule = {
  id: 'stop-required',
  name: 'Every Plan needs a Stop',
  timing: 'pre-fact',
  overridable: false,
  verdict: (_state, command) => {
    if (command.type !== 'CreatePlan' || isPrice(command.stopPrice)) return null;
    return (
      'Without a Stop there is no 1R, so nothing this trade produces could be measured — ' +
      'and no distance to solve a size from. Decide where the idea is wrong, or leave it.'
    );
  },
};

/**
 * The Drawdown tripwire: at a 20% fall from Peak Balance, no new Plan until
 * the log has been reviewed. It acts before the trade, so alone among the
 * things the account can say about itself, it can genuinely stop one.
 *
 * The pause is the point rather than the threshold. The source notes' own
 * simulations put the average peak-to-trough at around 42% even at 2% Risk, so
 * 20% down is not a broken account — it is the moment those notes identify as
 * where discipline actually breaks, and all this Rule does is make reading the
 * log the thing that happens instead of the next trade.
 *
 * Judged on the derived tripwire rather than on the Drawdown alone, so the
 * acknowledgement clears it and a recovery re-arms it — both of which are the
 * fold's to work out, not this Rule's.
 */
const drawdownReview: Rule = {
  id: 'drawdown-review',
  name: `Review the log at a ${DRAWDOWN_TRIPWIRE * 100}% Drawdown`,
  timing: 'pre-fact',
  overridable: true,
  verdict: (state, command) => {
    // A new Plan only. One already sized and waiting was decided while the
    // account was still inside the threshold, and blocking it here would
    // strand it rather than pause anything.
    if (command.type !== 'CreatePlan' || !state.drawdownReviewDue) return null;

    return (
      `You are ${drawdownPercent(state.drawdown).toFixed(1)}% down from a Peak Balance ` +
      `of $${state.peakBalance.toFixed(2)}. Read the log and confirm it, and this opens ` +
      'up on its own — the trade after a drawdown is the one the log has most to say about.'
    );
  },
};

/**
 * Back the log up, or stop trading. At ten Trades since the last Backup, no
 * new Plan until a copy of the log exists somewhere other than this phone.
 *
 * It is the only Rule not about the trade in front of the trader, and it is
 * enforced the same way because the failure it guards against is worse than
 * any single bad trade: browser storage is deletable, and a log that vanishes
 * at Trade 40 takes the Expectancy, the Capture Rate and the whole reason for
 * typing any of it in with it. Nagging alone would not do — a nag is exactly
 * what gets ignored for the six weeks before the phone is lost.
 *
 * Overridable, like every block that has something to record. Backing up in
 * the sixty seconds before an entry is a real cost, so the trader can say so
 * and go — and the Violation says they did.
 *
 * A new Plan only, exactly as the tripwire is. A Plan already sized was
 * decided before this came due, and blocking it here would strand it: the
 * Trade it becomes is not the thing that goes unbacked, the log is.
 */
const backUpTheLog: Rule = {
  id: 'back-up-the-log',
  name: `Back up after ${UNBACKED_TRADE_LIMIT} Trades`,
  timing: 'pre-fact',
  overridable: true,
  verdict: (state, command) => {
    // Judged on the derived answer rather than on the count, so the Rule and
    // the panel that nags cannot disagree about when a Backup is due.
    if (command.type !== 'CreatePlan' || !state.backupDue) return null;

    return (
      `${state.tradesSinceBackup} Trades have closed since your last Backup, and they exist ` +
      'nowhere but on this phone. Take one — it is a file and a few seconds — and this opens ' +
      'up on its own.'
    );
  },
};

/**
 * The Liquidation Buffer: the Stop must sit no further than half the distance
 * from entry to the liquidation price the exchange reports. Past halfway the
 * Stop is competing with the exchange to close the trade, and the exchange
 * charges more for it.
 */
const liquidationBuffer: Rule = {
  id: 'liquidation-buffer',
  name: 'The Stop stays inside the Liquidation Buffer',
  timing: 'pre-fact',
  overridable: true,
  verdict: (_state, command) => {
    if (command.type !== 'CreatePlan') return null;
    // A missing Stop or liquidation price is somebody else's verdict to give.
    if (!isPrice(command.stopPrice) || !isPrice(command.liquidationPrice)) return null;

    const toLiquidation = Math.abs(command.entryPrice - command.liquidationPrice);
    if (toLiquidation === 0) return null;
    const share = Math.abs(command.entryPrice - command.stopPrice) / toLiquidation;
    if (share <= 0.5) return null;

    return (
      `That Stop sits ${Math.round(share * 100)}% of the way from the entry to liquidation. ` +
      'It must sit no further than half, so the Stop fires with room to spare rather than ' +
      'the exchange closing the trade for you.'
    );
  },
};

/**
 * One Position at a time. Two open trades are rarely two ideas — they are
 * usually the same idea twice, at twice the size that was sized for.
 */
const onePositionAtATime: Rule = {
  id: 'one-position-at-a-time',
  name: 'One Position at a time',
  timing: 'pre-fact',
  overridable: true,
  verdict: (state, command) => {
    if (command.type !== 'OpenPosition' || state.openPositions.length === 0) return null;
    return (
      'A Position is already live. Staying sequential is what keeps two correlated trades ' +
      'from adding up to one oversized one.'
    );
  },
};

/**
 * A Stop tightens and never widens. Tightening is ordinary trade management —
 * trailing to breakeven and beyond — and the app says nothing about it. Moving
 * the Stop the other way is the one thing a live Position can do that puts
 * more at risk than was committed at entry, and it is how a 1R loss quietly
 * becomes an account event.
 *
 * The move is judged against where the Stop stands *now* rather than where the
 * Plan put it, because giving back risk already taken off the table is the
 * same reflex as widening past the original: the Stop is being moved because
 * the price arrived, not because the idea changed.
 *
 * 1R does not enter into it. Whichever way the Stop goes, the denominator
 * stays at the original Stop (ADR-0001) — this Rule governs the risk still
 * live on the exchange, not the risk the Trade will be measured in.
 */
const stopNeverWidens: Rule = {
  id: 'stop-never-widens',
  name: 'A Stop tightens, never widens',
  timing: 'pre-fact',
  overridable: true,
  verdict: (state, command) => {
    if (command.type !== 'MoveStop') return null;
    const position = state.openPositions.find((open) => open.plan.id === command.planId);
    // No Position, no Stop to move: the command is refused before it reaches
    // a Rule, and there is nothing here to say about it.
    if (!position) return null;
    if (!isPrice(command.stopPrice)) return null;

    const { direction } = position.plan;
    const widening =
      direction === 'long'
        ? command.stopPrice < position.stopPrice
        : command.stopPrice > position.stopPrice;
    if (!widening) return null;

    return (
      `That moves the Stop from ${position.stopPrice} to ${command.stopPrice}, away from the entry. ` +
      'Widening is how a 1R loss turns into an account event — and it will not buy you a bigger 1R, ' +
      'because the Trade is still measured against the Stop you sized at.'
    );
  },
};

/**
 * The account is untouchable below the base: a Withdrawal takes profit, or it
 * takes the compounding base itself, and only one of those is free. The source
 * notes name draining the base for random reasons as the single biggest leak
 * of the last attempt.
 *
 * It warns and never blocks, and that is not politeness. The money has already
 * gone. Refusing to record it would only leave a Ledger claiming it is still
 * there, and every Position sized from here would be sized off money the
 * account does not have.
 */
const withdrawalNeverTouchesTheBase: Rule = {
  id: 'withdrawal-never-touches-the-base',
  name: 'A Withdrawal comes out of profit, never the base',
  timing: 'post-fact',
  overridable: false,
  verdict: (state, command) => {
    if (command.type !== 'RecordWithdrawal') return null;
    const left = toCents(state.balance - command.amount);
    if (left >= state.base) return null;

    return (
      `That takes $${(state.base - left).toFixed(2)} out of the base itself rather than ` +
      'out of profit. The base is the thing that compounds — draining it is the leak that costs ' +
      'every trade after it, because every Position from here is sized off what is left.'
    );
  },
};

/**
 * And even out of profit, only once the account has doubled. Taking profit
 * before then is how a base never grows to the point where 2% of it is worth
 * having, which is the arithmetic the whole framework runs on.
 */
const withdrawalWaitsForTheDouble: Rule = {
  id: 'withdrawal-waits-for-the-double',
  name: 'Withdraw only once the account has doubled',
  timing: 'post-fact',
  overridable: false,
  verdict: (state, command) => {
    if (command.type !== 'RecordWithdrawal' || hasDoubled(state.balance, state.base)) return null;

    return (
      `The account has not doubled its base yet: that is $${(state.base * 2).toFixed(2)}, ` +
      `and the Balance is $${state.balance.toFixed(2)}. By rule rather than by mood is ` +
      'the whole difference between taking profit and draining the account.'
    );
  },
};

export const RULES: readonly Rule[] = [
  stopRequired,
  drawdownReview,
  backUpTheLog,
  liquidationBuffer,
  onePositionAtATime,
  stopNeverWidens,
  withdrawalNeverTouchesTheBase,
  withdrawalWaitsForTheDouble,
];

/** What a Rule is called, for a Violation that stored only its id. */
export function ruleName(ruleId: RuleId): string {
  return RULES.find((rule) => rule.id === ruleId)?.name ?? ruleId;
}

/**
 * Every Rule this command breaks, in the order the Rules are declared —
 * whether the command can be stopped by them or not. Private, because the
 * difference between the two is the point: everything outside this module
 * asks for one kind or the other by name.
 */
function judge(state: DerivedState, command: Command): readonly RuleVerdict[] {
  return RULES.flatMap((rule) => {
    const explanation = rule.verdict(state, command);
    if (explanation === null) return [];
    return [{ ruleId: rule.id, timing: rule.timing, overridable: rule.overridable, explanation }];
  });
}

/**
 * The Rules that can stop this command: the ones that get to act before the
 * thing they are about has happened. An empty list is a clear command;
 * anything else is what the UI renders and what an Override turns into
 * Violations.
 */
export function blocks(state: DerivedState, command: Command): readonly RuleVerdict[] {
  return judge(state, command).filter((verdict) => verdict.timing === 'pre-fact');
}

/**
 * The Rules that can only warn about it. A separate function rather than a
 * filter at the call site, so that nothing downstream can mistake one of these
 * for a block and refuse to record something that has already happened.
 */
export function warnings(state: DerivedState, command: Command): readonly RuleVerdict[] {
  return judge(state, command).filter((verdict) => verdict.timing === 'post-fact');
}
