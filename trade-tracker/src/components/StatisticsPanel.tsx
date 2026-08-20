import type { Aggregates, EquityCurve, Statistics } from '../core/statistics';
import { STATISTICS_MINIMUM_TRADES } from '../core/statistics';
import {
  formatAverageR,
  formatCaptureRate,
  formatDrawdown,
  formatMoney,
  formatPercent,
} from '../format';

interface StatisticsPanelProps {
  /** Folded from the log in the core, at whatever count the log stands at. */
  statistics: Statistics;
}

/**
 * What the log adds up to — and, until it holds 30 closed Trades, a count of
 * how far off that is and nothing else.
 *
 * The gate is here rather than around the arithmetic, deliberately (ADR-0002).
 * The core works every figure out at any count, and this is the one place that
 * decides whether they may be looked at: a win rate from seven Trades is a
 * random number, and a random number on screen gets steered by — out of a real
 * edge during an ordinary losing streak, or into a bigger size after a lucky
 * one. What the trader gets instead is the counter, which is the only honest
 * thing there is to say before then.
 *
 * Nothing here computes. Every figure arrives solved and every one of them is
 * printed by a formatter, so the panel cannot come to disagree with the core
 * about what the log says.
 */
export default function StatisticsPanel({ statistics }: StatisticsPanelProps) {
  return (
    <section className="stats" aria-labelledby="stats-heading">
      <h2 className="stats__heading" id="stats-heading">
        Statistics
      </h2>
      <p className="stats__count" aria-label="Trades logged">
        {counted(statistics)}
      </p>
      {statistics.readable ? (
        <Figures statistics={statistics} />
      ) : (
        <p className="stats__why">
          A win rate from a handful of Trades is a random number, so nothing about your
          performance is shown until 30 have closed. Abandoned Plans do not count toward it.
        </p>
      )}
    </section>
  );
}

/** The counter, and what it turns into once it has done its job. */
function counted({ trades, readable }: Statistics): string {
  if (readable) return `${trades} Trades logged`;
  return `${trades} / ${STATISTICS_MINIMUM_TRADES} Trades logged`;
}

function Figures({ statistics }: { statistics: Statistics }) {
  return (
    <>
      <dl className="stats__figures">
        <Figure label="Win rate" value={formatPercent(statistics.winRate)} />
        {/* Apart rather than netted: an edge is a shape — how much the winners
            make against how much the losers cost — and Expectancy alone hides
            which of the two moved. */}
        <Figure label="Average win" value={formatAverageR(statistics.averageWinR)} />
        <Figure label="Average loss" value={formatAverageR(statistics.averageLossR)} />
        {/* The figure the whole log exists for, and the one it is read for:
            what an average Trade returns, after the exchange has been paid. */}
        <Figure label="Expectancy per Trade" value={formatAverageR(statistics.expectancy)} />
        <Figure
          label="Average Capture Rate"
          value={formatCaptureRate(statistics.averageCaptureRate)}
        />
        {/* Against the Risk taken, which is the unit everything else here is
            in: what Expectancy has to clear before the account grows at all. */}
        <Figure label="Fee drag" value={formatPercent(statistics.feeDrag)} />
        <Figure label="Max Drawdown" value={formatDrawdown(statistics.maxDrawdown)} />
      </dl>
      <EquityLine curve={statistics.equityCurve} />
      <Compliance statistics={statistics} />
    </>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="stats__figure">
      <dt>{label}</dt>
      <dd aria-label={label}>{value}</dd>
    </div>
  );
}

/**
 * The Balance through the whole Ledger, drawn from the points the core solved.
 *
 * Unscaled and unlabelled on purpose: this is the shape of the account, and
 * every figure worth a number is in the list above it.
 */
function EquityLine({ curve }: { curve: EquityCurve }) {
  if (curve.points.length === 0) return null;

  return (
    <svg
      className="stats__curve"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Equity curve, ${formatMoney(curve.from)} to ${formatMoney(curve.to)}`}
    >
      <polyline
        points={curve.points.map((point) => `${point.x},${point.y}`).join(' ')}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * The rule breaks beside the rule-following Trades. This is what overriding a
 * Rule costs and what makes it affordable: every block in this app can be gone
 * through by typing a reason, and the price is a log where the breaks are
 * countable next to the Trades that kept to the Rules.
 */
function Compliance({ statistics }: { statistics: Statistics }) {
  return (
    <table className="stats__compliance">
      <caption>Rule breaks against the rest</caption>
      <thead>
        <tr>
          <th scope="col">
            <span className="stats__hidden">Rules</span>
          </th>
          <th scope="col">Trades</th>
          <th scope="col">Win rate</th>
          <th scope="col">Expectancy</th>
        </tr>
      </thead>
      <tbody>
        <ComplianceRow label="Broke a Rule" figures={statistics.withViolations} />
        <ComplianceRow label="Broke none" figures={statistics.withoutViolations} />
      </tbody>
    </table>
  );
}

/**
 * One cohort. A row nothing fell into reads as a count of none and two dashes,
 * rather than the 0% and +0.00R that would look like a measured result.
 */
function ComplianceRow({ label, figures }: { label: string; figures: Aggregates }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{figures.trades}</td>
      <td>{formatPercent(figures.winRate)}</td>
      <td>{formatAverageR(figures.expectancy)}</td>
    </tr>
  );
}
