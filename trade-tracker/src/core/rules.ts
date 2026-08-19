import type { Command } from './commands';
import { isPrice } from './money';
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
  'liquidation-buffer',
  'one-position-at-a-time',
  'stop-never-widens',
] as const;

/** Named on every Violation, so the log stores an id rather than prose. */
export type RuleId = (typeof RULE_IDS)[number];

/**
 * When a Rule gets to act. Pre-fact Rules block a command before it happens
 * and can be overridden by typing a reason. Post-fact Rules can only warn,
 * because the Ledger must record what already happened — a Withdrawal is the
 * one of those, and it arrives with ticket 08.
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

export const RULES: readonly Rule[] = [
  stopRequired,
  liquidationBuffer,
  onePositionAtATime,
  stopNeverWidens,
];

/** What a Rule is called, for a Violation that stored only its id. */
export function ruleName(ruleId: RuleId): string {
  return RULES.find((rule) => rule.id === ruleId)?.name ?? ruleId;
}

/**
 * Every Rule this command breaks, in the order the Rules are declared. An
 * empty list is a clear command; anything else is what the UI renders and what
 * an Override turns into Violations.
 */
export function judge(state: DerivedState, command: Command): readonly RuleVerdict[] {
  return RULES.flatMap((rule) => {
    const explanation = rule.verdict(state, command);
    return explanation === null ? [] : [{ ruleId: rule.id, overridable: rule.overridable, explanation }];
  });
}
