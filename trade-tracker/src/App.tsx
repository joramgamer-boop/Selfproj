import { useMemo } from 'react';
import BackupPanel from './components/BackupPanel';
import BalanceHeadline from './components/BalanceHeadline';
import DepositForm from './components/DepositForm';
import DrawdownTripwire from './components/DrawdownTripwire';
import LedgerList from './components/LedgerList';
import PlanList from './components/PlanList';
import PlanSizer from './components/PlanSizer';
import PositionPanel from './components/PositionPanel';
import RiskDefaultSetting from './components/RiskDefaultSetting';
import StatisticsPanel from './components/StatisticsPanel';
import StorageNotice from './components/StorageNotice';
import TradeLog from './components/TradeLog';
import WithdrawalForm from './components/WithdrawalForm';
import type { Clock } from './core/clock';
import { withdrawalWarnings } from './core/commands';
import { tradeLog } from './core/log';
import { statisticsOf } from './core/statistics';
import { plansAwaitingADecision } from './core/state';
import type { IdSource } from './core/ids';
import { createBackups } from './backups';
import type { EvidenceActions } from './evidence';
import type { Downloads } from './storage/downloads';
import type { DurableStorage } from './storage/durability';
import type { EventStore } from './storage/eventStore';
import { useDurability } from './useDurability';
import { useTradeTracker } from './useTradeTracker';
import './App.css';

interface AppProps {
  store: EventStore;
  clock: Clock;
  ids: IdSource;
  durableStorage: DurableStorage;
  downloads: Downloads;
}

export default function App({ store, clock, ids, durableStorage, downloads }: AppProps) {
  const context = useMemo(() => ({ clock, ids }), [clock, ids]);
  const tracker = useTradeTracker(store, context);
  const { status, state, record, openEvidence } = tracker;
  const durability = useDurability(durableStorage);
  // Not memoised, and deliberately: it closes over the log as it stands this
  // render, and a Backup taken from a stale one would be a Backup missing the
  // last Trade.
  const backups = createBackups(store, downloads, clock, tracker);
  // Derived where every other figure is: by folding the log, in the core.
  const log = useMemo(() => tradeLog(state), [state]);
  const waiting = useMemo(() => plansAwaitingADecision(state), [state]);
  // Worked out at every count, and shown at 30 (ADR-0002). The gate is the
  // panel's, not the fold's.
  const statistics = useMemo(() => statisticsOf(state), [state]);
  // One capability rather than three props: looking at a screenshot, putting
  // one on, and taking one off all travel down to the same Trade detail.
  const evidence = useMemo<EvidenceActions>(
    () => ({
      open: openEvidence,
      attach: (planId, image) => record({ type: 'AttachEvidence', planId, image }),
      remove: (planId) => record({ type: 'RemoveEvidence', planId }),
    }),
    [openEvidence, record],
  );

  if (status === 'loading') {
    return (
      <main className="app">
        <p className="app__loading">Reading the Ledger…</p>
      </main>
    );
  }

  return (
    <main className="app">
      <h1 className="app__title">Trade Tracker</h1>
      <BalanceHeadline
        balance={state.balance}
        peakBalance={state.peakBalance}
        drawdown={state.drawdown}
      />
      {/* Above the sizer: while a Position is live it is the only thing on the
          screen that can still cost anything. */}
      {state.openPositions.map((position) => (
        <PositionPanel
          key={position.plan.id}
          position={position}
          clock={clock}
          onClose={record}
          onMoveStop={record}
        />
      ))}
      {/* Above the sizer, not inside it: the pause is meant to arrive before
          the decision to trade, not halfway through sizing one. */}
      {state.drawdownReviewDue && (
        <DrawdownTripwire
          drawdown={state.drawdown}
          onAcknowledge={() => record({ type: 'AcknowledgeDrawdownReview' })}
        />
      )}
      <PlanSizer balance={state.balance} riskDefault={state.riskDefault} onCreate={record} />
      <PlanList plans={waiting} onOpen={record} onAbandon={record} />
      {/* Above the log rather than under it. The log grows without limit, and
          a count of unbacked Trades below it is one nobody scrolls to — while
          the thing it is nagging about is the log itself. */}
      <BackupPanel
        tradesSinceBackup={state.tradesSinceBackup}
        backupDue={state.backupDue}
        backups={backups}
      />
      {/* Directly above the log it is a reading of, so the figures and the rows
          they came from are reviewed in one place — and below the sizer,
          because none of this is meant to be consulted while sizing a trade. */}
      <StatisticsPanel statistics={statistics} />
      {/* Beneath the Plans awaiting a decision, because it is what gets read
          rather than acted on — and above the account, because a review starts
          with the Trades and only then asks what they did to the Balance. */}
      <TradeLog rows={log} evidence={evidence} />
      <DepositForm onRecord={(amount) => record({ type: 'RecordDeposit', amount })} />
      <WithdrawalForm
        warningsFor={(amount) => withdrawalWarnings(state, amount)}
        onRecord={(amount) => record({ type: 'RecordWithdrawal', amount })}
      />
      <LedgerList entries={state.ledger} />
      <RiskDefaultSetting
        riskDefault={state.riskDefault}
        onSave={(riskFraction) => record({ type: 'SetRiskDefault', riskFraction })}
      />
      {durability && <StorageNotice durability={durability} />}
    </main>
  );
}
