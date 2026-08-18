import type { Command } from './commands';
import type { DerivedState } from './state';

/**
 * The Rules the app enforces, modelled as data: an id, a name, a verdict
 * function over derived state and the proposed command, and a classification.
 *
 * Nothing about a Rule lives in a component. The UI renders the verdicts this
 * module returns and never decides one — a Rule check that leaked into the UI
 * would be untestable at the primary seam.
 */

export const RULE_IDS = ['stop-required', 'liquidation-buffer', 'one-position-at-a-time'] as const;

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
  /** Why this command breaks the Rule, or null when it does not. */
  verdict(state: DerivedState, command: Command): string | null;
}

/** A Rule, and what it has to say about the command that was proposed. */
export interface RuleVerdict {
  readonly ruleId: RuleId;
  readonly rule: string;
  readonly timing: RuleTiming;
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
 * only input Notional is solved from, so this is the one block an Override
 * cannot get past: there is no sized Plan for the reason to be attached to.
 */
const stopRequired: Rule = {
  id: 'stop-required',
  name: 'Every Plan needs a Stop',
  timing: 'pre-fact',
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
  verdict: (state, command) => {
    if (command.type !== 'OpenPosition' || state.openPositions.length === 0) return null;
    return (
      'A Position is already live. Staying sequential is what keeps two correlated trades ' +
      'from adding up to one oversized one.'
    );
  },
};

export const RULES: readonly Rule[] = [stopRequired, liquidationBuffer, onePositionAtATime];

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
    if (explanation === null) return [];
    return [{ ruleId: rule.id, rule: rule.name, timing: rule.timing, explanation }];
  });
}

function isPrice(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
