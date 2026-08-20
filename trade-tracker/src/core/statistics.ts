import { drawdownOf } from './account';
import { captureRateOf, rMultipleOf } from './settlement';
import type { DerivedState, Trade } from './state';

/**
 * What the log adds up to: the question the whole record exists to answer, and
 * the one figure in this app that must not be looked at early.
 *
 * Everything here is computed at any Trade count. The gate is `readable`, read
 * at the render boundary — withholding the arithmetic instead would leave the
 * app unable to say how close the log is to answering (ADR-0002).
 *
 * Counts are always numbers; every average, rate and share is a number or
 * null. An average of no Trades is not zero, it is nothing — and a "+0.00R"
 * where there is no answer reads as an edge that made exactly what it lost.
 */

/**
 * How many Trades must have closed before any of this may go on screen.
 *
 * The number is the whole point. The source notes' own simulations put a
 * two-month window on a $100 account anywhere between $45 and $167 on
 * identical inputs, so a win rate from seven Trades is a random number — and a
 * random number on screen is worse than none, because it gets steered by. The
 * expensive failure is abandoning a real edge during an ordinary losing
 * streak, or scaling up after a lucky one.
 */
export const STATISTICS_MINIMUM_TRADES = 30;

/** The figures that can be worked out over any set of Trades. */
export interface Aggregates {
  /** Closed Trades, and only those: an Abandoned Plan moved no money. */
  readonly trades: number;
  /** A Trade above 0R. A breakeven is neither a win nor a loss. */
  readonly wins: number;
  readonly losses: number;
  /** Winners over every Trade — breakevens included in the denominator. */
  readonly winRate: number | null;
  /** Mean R over the winners. */
  readonly averageWinR: number | null;
  /** Mean R over the losers, carrying its sign, so it reads as the loss it is. */
  readonly averageLossR: number | null;
  /**
   * What an average Trade returns, in R. The glossary writes it
   * `(win rate × avg win R) − (loss rate × avg loss R)`, where the average
   * loss is a magnitude; here it carries its sign, so the same arithmetic is
   * an addition.
   */
  readonly expectancy: number | null;
  /**
   * The mean share of the available move these Trades kept — the single lever
   * the source notes identify as raising returns and lowering drawdown at the
   * same time.
   *
   * Trades that never had a move available are left out rather than counted as
   * zero, exactly as one row of the log leaves them out: a zero there would be
   * a verdict on how the Trade was managed, and there is none to give.
   */
  readonly averageCaptureRate: number | null;
  /**
   * Every dollar of fees over every dollar of Risk taken — the share of an
   * average 1R the exchange kept, and so the amount Expectancy has to clear
   * before the account grows at all.
   *
   * Against the Risk rather than against the Notional or the P&L: 1R is the
   * unit every other figure here is in, and a drag quoted against a Notional
   * ten times the size of the Risk would read as a tenth of what it costs.
   */
  readonly feeDrag: number | null;
}

/**
 * The Balance through the whole Ledger, ready to draw: the ends the line runs
 * between, and the line itself in a box with the Balance running up it.
 *
 * The scaling sits here rather than in the panel because it is arithmetic over
 * derived figures, and none of that belongs in a component. It is also the
 * only part of a curve that can be silently wrong — an upside-down line still
 * renders — so it belongs where the tests are.
 */
export interface EquityCurve {
  /** The Balance at the first movement of the Ledger, and at the last. */
  readonly from: number;
  readonly to: number;
  /** Empty until the Ledger has two movements: one point is not a line. */
  readonly points: readonly EquityPoint[];
}

/** One point of the line, in a box whatever draws it scales to its own size. */
export interface EquityPoint {
  /** 0 at the first movement of the Ledger, 100 at the last. */
  readonly x: number;
  /** 0 at the highest Balance the Ledger reached, 100 at the lowest. */
  readonly y: number;
}

export interface Statistics extends Aggregates {
  /**
   * Whether these figures may be rendered — the gate, and the first thing the
   * screen reads. Everything beside it is worked out either way.
   */
  readonly readable: boolean;
  /**
   * The deepest fall from Peak Balance the account ever ran, as a share of the
   * peak — not the fall standing now, which is on the Balance headline.
   *
   * The same Drawdown the tripwire fires on, measured over the same Ledger: a
   * second definition here would put a figure on the statistics panel that
   * argued with the banner above it. A Withdrawal deepens it, because a
   * Withdrawal really did take the Balance down.
   */
  readonly maxDrawdown: number;
  readonly equityCurve: EquityCurve;
  /**
   * The same figures again, over the Trades that carry a Violation and over
   * the Trades that carry none.
   *
   * This is what makes overriding a Rule affordable. Every block in this app
   * can be gone through by typing a reason, and the price of that is a log
   * where the breaks are countable: an Expectancy of −0.4R over the Trades
   * that broke a Rule, beside +0.3R over the ones that did not, is the only
   * argument the app can make that is not an opinion.
   */
  readonly withViolations: Aggregates;
  readonly withoutViolations: Aggregates;
}

export function statisticsOf(state: DerivedState): Statistics {
  const overall = aggregate(state.trades);
  const broke = (trade: Trade) => trade.plan.violations.length > 0;

  return {
    ...overall,
    readable: overall.trades >= STATISTICS_MINIMUM_TRADES,
    maxDrawdown: deepestDrawdown(state),
    equityCurve: equityCurveOf(state),
    withViolations: aggregate(state.trades.filter(broke)),
    withoutViolations: aggregate(state.trades.filter((trade) => !broke(trade))),
  };
}

/**
 * The Trades, in the unit they are all compared in. Only Trades reach here: a
 * Plan that was skipped moved no money, and a Position still live has not come
 * to anything yet.
 */
function aggregate(trades: readonly Trade[]): Aggregates {
  const multiples = trades.map(rMultipleOf);
  const wins = multiples.filter((multiple) => multiple > 0);
  const losses = multiples.filter((multiple) => multiple < 0);
  const captured = trades.map(captureRateOf).filter((rate): rate is number => rate !== null);
  const fees = trades.reduce((total, trade) => total + trade.fees, 0);
  const riskTaken = trades.reduce((total, trade) => total + trade.plan.oneR, 0);

  const winRate = share(wins.length, multiples.length);
  const lossRate = share(losses.length, multiples.length);
  const averageWinR = mean(wins);
  const averageLossR = mean(losses);

  return {
    trades: multiples.length,
    wins: wins.length,
    losses: losses.length,
    winRate,
    averageWinR,
    averageLossR,
    // A Trade that won nothing and lost nothing returned nothing, which is a
    // real answer — so this is null only where there is no Trade at all.
    expectancy:
      winRate === null
        ? null
        : winRate * (averageWinR ?? 0) + (lossRate ?? 0) * (averageLossR ?? 0),
    averageCaptureRate: mean(captured),
    feeDrag: share(fees, riskTaken),
  };
}

/**
 * The deepest the Balance ever fell below its own high-water mark. The peak is
 * carried forward rather than taken from derived state, because the fall at
 * each point is the fall from the peak *as it stood then* — measuring every
 * point against today's peak would report a Drawdown the account never ran.
 */
function deepestDrawdown(state: DerivedState): number {
  let peak = 0;
  let deepest = 0;

  for (const entry of state.ledger) {
    peak = Math.max(peak, entry.balanceAfter);
    deepest = Math.max(deepest, drawdownOf(entry.balanceAfter, peak));
  }

  return deepest;
}

/**
 * The Ledger as a line. A point per entry rather than per Trade, so the curve
 * is the account the trader actually has — a Deposit steps it up without being
 * a result, and a curve that hid one would show a Drawdown recovering that
 * never happened.
 */
function equityCurveOf(state: DerivedState): EquityCurve {
  const balances = state.ledger.map((entry) => entry.balanceAfter);
  const ends = { from: balances[0] ?? 0, to: balances[balances.length - 1] ?? 0 };
  // One movement makes a dot, which says nothing the Balance does not already
  // say — and a lone point would divide by zero on its way to an x.
  if (balances.length < 2) return { ...ends, points: [] };

  const low = Math.min(...balances);
  const high = Math.max(...balances);
  // A Ledger that never moved off one figure draws a flat line rather than
  // dividing by zero, which is exactly what it was.
  const span = high - low || 1;

  return {
    ...ends,
    points: balances.map((balance, index) => ({
      x: (index / (balances.length - 1)) * 100,
      // Upside down, because a box's y grows downward and a Balance does not.
      y: 100 - ((balance - low) / span) * 100,
    })),
  };
}

/** Null where there is nothing to take a share of, rather than a made-up zero. */
function share(part: number, whole: number): number | null {
  return whole === 0 ? null : part / whole;
}

function mean(values: readonly number[]): number | null {
  return share(
    values.reduce((total, value) => total + value, 0),
    values.length,
  );
}
