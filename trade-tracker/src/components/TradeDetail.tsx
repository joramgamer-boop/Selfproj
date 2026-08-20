import type { TradeRow } from '../core/log';
import type { EvidenceActions } from '../evidence';
import { availableMoveOf } from '../core/settlement';
import {
  formatCaptureRate,
  formatDirection,
  formatExitReason,
  formatMoney,
  formatPriceDistance,
  formatR,
  formatRiskPercent,
  formatWhen,
} from '../format';
import Evidence from './Evidence';
import Violations from './Violations';

interface TradeDetailProps {
  row: TradeRow;
  /** The screenshot on this Trade is opened, replaced and removed from here. */
  evidence: EvidenceActions;
}

/**
 * One Trade, exhaustively: everything that was typed and everything solved
 * from it. Where the row is what gets skimmed, this is what gets read — so
 * nothing is summarised out of it, and the figures the Plan was sized on sit
 * beside the ones the close produced.
 *
 * Prices print raw rather than as money, exactly as they do on a Plan: a coin
 * quoted at 0.00001234 would round to $0.00 and the Stop would read as though
 * it sat at zero.
 */
export default function TradeDetail({ row, evidence }: TradeDetailProps) {
  const { trade, rMultiple, captureRate } = row;
  const { plan } = trade;

  return (
    <div className="detail">
      <dl className="detail__fields">
        <Figure label="Direction" value={formatDirection(plan.direction)} />
        <Figure label="Planned entry" value={plan.entryPrice} />
        <Figure label="Entry filled" value={trade.entryPrice} />
        <Figure label="Exit" value={trade.exitPrice} />
        {/* Required on losers as well as winners: it is the whole reason a
            round-trip can be told apart from a trade that never worked. */}
        <Figure label="Best Price" value={trade.bestPrice} />
        {/* What the Capture Rate below divides by, spelled out: a −1R against
            a large available move is a round-trip, and against a small one is
            a trade that simply never worked. */}
        <Figure label="Available move" value={formatPriceDistance(availableMoveOf(trade))} />
        {/* The Stop the Plan was sized at, which is the one 1R is fixed to
            however far the Stop was trailed afterwards (ADR-0001). */}
        <Figure label="Stop as sized" value={plan.stopPrice} />
        <Figure label="Liquidation" value={plan.liquidationPrice} />
        <Figure label="Leverage" value={`${plan.leverage}x`} />
        <Figure label="Risk" value={formatRiskPercent(plan.riskFraction)} />
        <Figure label="Balance before" value={formatMoney(plan.balanceAtCreation)} />
        <Figure label="Notional" value={formatMoney(plan.notional)} />
        <Figure label="Margin" value={formatMoney(plan.margin)} />
        <Figure label="1R" value={formatMoney(plan.oneR)} />
        {/* When the Plan was sized, which is not when the hold began: the gap
            between this and the open is how long the idea sat before it was
            taken, and "price ran away" is what it costs. */}
        <Figure label="Sized" value={formatWhen(plan.at)} />
        <Figure label="Gross P&L" value={formatMoney(trade.grossPnl)} />
        <Figure label="Fees" value={formatMoney(trade.fees)} />
        <Figure label="Realized P&L" value={formatMoney(trade.realizedPnl)} />
        <Figure label="R-multiple" value={formatR(rMultiple)} />
        <Figure label="Capture Rate" value={formatCaptureRate(captureRate)} />
        <Figure label="Exit Reason" value={formatExitReason(trade.exitReason)} />
        {/* An edited stamp says so, because it is the difference between a
            hold duration that can be trusted and one that cannot. */}
        <Figure label="Opened" value={formatWhen(trade.openedAt)} edited={trade.openedAtEdited} />
        <Figure label="Closed" value={formatWhen(trade.closedAt)} edited={trade.closedAtEdited} />
      </dl>
      {/* One Trade at a weighted average, flagged — never two Trades. */}
      {(trade.scaledIn || trade.scaledOut) && (
        <p className="detail__flag">
          {trade.scaledIn && <span>Scaled in</span>}
          {trade.scaledOut && <span>Scaled out</span>}
        </p>
      )}
      {trade.stopMoves.length > 0 && (
        <div className="detail__stops">
          <p className="detail__label">Stop moves</p>
          <ul className="detail__moves">
            {trade.stopMoves.map((move) => (
              <li className="detail__move" key={move.at}>
                <span>{move.stopPrice}</span>
                <span className="detail__when">{formatWhen(move.at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {trade.notes && (
        <div className="detail__notes">
          <p className="detail__label">Notes</p>
          <p className="detail__prose">{trade.notes}</p>
        </div>
      )}
      <Violations violations={plan.violations} />
      {/* Last, and deliberately: everything above it is what the trader typed
          and what was solved from it, and the screenshot is the one thing on
          this screen that no figure came out of (ADR-0003). */}
      <Evidence planId={plan.id} evidenceId={trade.evidenceId} evidence={evidence} />
    </div>
  );
}

interface FigureProps {
  label: string;
  value: string | number;
  /** Set when the trader corrected the stamp rather than accepting it. */
  edited?: boolean;
}

function Figure({ label, value, edited }: FigureProps) {
  return (
    <div className="detail__figure">
      <dt>{label}</dt>
      <dd>
        {value}
        {edited && <span className="detail__edited"> edited</span>}
      </dd>
    </div>
  );
}
