import { useState } from 'react';
import type { AbandonedPlanRow, LogRow, TradeRow } from '../core/log';
import type { EvidenceActions } from '../evidence';
import {
  formatAbandonReason,
  formatCaptureRate,
  formatDirection,
  formatExitReason,
  formatMoney,
  formatR,
  formatWhen,
} from '../format';
import PlanFigures from './PlanFigures';
import RiskFlag from './RiskFlag';
import TradeDetail from './TradeDetail';
import Violations from './Violations';

/**
 * The whole history in one place: every Trade and every Abandoned Plan, newest
 * first. It reports and never totals — what the log adds up to is gated on 30
 * Trades (ADR-0002), and a statistic computed from fewer is the thing this app
 * exists to stop the trader steering by.
 */
interface TradeLogProps {
  rows: readonly LogRow[];
  /** Passed through to the Trade detail, which is where a screenshot lives. */
  evidence: EvidenceActions;
}

export default function TradeLog({ rows, evidence }: TradeLogProps) {
  return (
    <section className="log" aria-labelledby="log-heading">
      <h2 className="log__heading" id="log-heading">
        Trade log
      </h2>
      {rows.length === 0 ? (
        <p className="log__empty">Nothing has ended yet.</p>
      ) : (
        <ul className="log__rows">
          {rows.map((row) =>
            row.kind === 'Trade' ? (
              <TradeEntry key={row.trade.plan.id} row={row} evidence={evidence} />
            ) : (
              <AbandonedEntry key={row.plan.id} row={row} />
            ),
          )}
        </ul>
      )}
    </section>
  );
}

/**
 * One Trade as it reads at a skim: what it came to in R, what share of the
 * available move it kept, and whether a Rule was broken to take it. Everything
 * else is a tap away — but the Violations and the Risk flag are not, because a
 * rule break that has to be opened to be seen is one that gets overlooked in
 * exactly the review it exists for.
 */
function TradeEntry({ row, evidence }: { row: TradeRow; evidence: EvidenceActions }) {
  const [open, setOpen] = useState(false);
  const { trade, rMultiple, captureRate } = row;
  const { plan } = trade;
  // Breakeven is its own answer. A Stop trailed to entry and hit there is
  // exactly the 0R that ADR-0001 keeps the denominator fixed to report, and
  // colouring it as a win would be the one reading it must never get.
  const outcome = rMultiple === 0 ? 'even' : rMultiple > 0 ? 'up' : 'down';

  return (
    // Named for what it is and which one it is: every row on the log is a
    // Trade, so a label that stopped at the word would leave the list
    // unnavigable by anything but position.
    <li
      className="log__row"
      aria-label={`Trade — ${formatDirection(plan.direction)} at ${trade.entryPrice}, ${formatWhen(row.at)}`}
    >
      <p className="figures__headline">
        <span className="figures__direction">{formatDirection(plan.direction)}</span>
        <span className="figures__entry">at {trade.entryPrice}</span>
        {/* The result closes the headline, where 1R closes a Plan's: this
            Trade is over, and what it came to is the thing being reviewed.
            Coloured by its sign — the only figure on the row a skim reads
            before it reads the number. */}
        <span className={`log__result log__result--${outcome}`}>{formatR(rMultiple)}</span>
      </p>
      <p className="figures__detail">
        <span>1R {formatMoney(plan.oneR)}</span>
        {/* On losers as well as winners, so a round-trip — a Trade that gave
            back everything on offer — reads as one without being opened. */}
        <span>Capture Rate {formatCaptureRate(captureRate)}</span>
        <span>{formatExitReason(trade.exitReason)}</span>
        <span>{formatWhen(row.at)}</span>
      </p>
      <RiskFlag aboveDefaultRisk={plan.aboveDefaultRisk} />
      <Violations violations={plan.violations} />
      <button
        type="button"
        className="log__more"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? 'Hide the detail' : 'Everything logged'}
      </button>
      {open && <TradeDetail row={row} evidence={evidence} />}
    </li>
  );
}

/**
 * One Plan that was sized and then not taken. It carries no result, because a
 * skip moved no money — but it carries its figures and its reason, since
 * skipping is part of the edge and "price ran away" only reads as entry lag
 * once every one of them is in the same list as the Trades.
 */
function AbandonedEntry({ row }: { row: AbandonedPlanRow }) {
  const { plan } = row;

  return (
    <li
      className="log__row log__row--abandoned"
      aria-label={`Abandoned Plan — ${formatDirection(plan.direction)} at ${plan.entryPrice}, ${formatWhen(row.at)}`}
    >
      <PlanFigures plan={plan} />
      <p className="figures__detail">
        <span className="log__outcome">Abandoned — {formatAbandonReason(row.reason)}</span>
        <span>{formatWhen(row.at)}</span>
      </p>
      <RiskFlag aboveDefaultRisk={plan.aboveDefaultRisk} />
      <Violations violations={plan.violations} />
    </li>
  );
}
