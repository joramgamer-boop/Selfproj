import { useMemo } from 'react';
import BalanceHeadline from './components/BalanceHeadline';
import DepositForm from './components/DepositForm';
import DrawdownTripwire from './components/DrawdownTripwire';
import LedgerList from './components/LedgerList';
import PlanList from './components/PlanList';
import PlanSizer from './components/PlanSizer';
import PositionPanel from './components/PositionPanel';
import RiskDefaultSetting from './components/RiskDefaultSetting';
import StorageNotice from './components/StorageNotice';
import TradeLog from './components/TradeLog';
import WithdrawalForm from './components/WithdrawalForm';
import type { Clock } from './core/clock';
import { withdrawalWarnings } from './core/commands';
import { tradeLog } from './core/log';
import { plansAwaitingADecision } from './core/state';
import type { IdSource } from './core/ids';
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
}

export default function App({ store, clock, ids, durableStorage }: AppProps) {
  const context = useMemo(() => ({ clock, ids }), [clock, ids]);
  const { status, state, record } = useTradeTracker(store, context);
  const durability = useDurability(durableStorage);
  // Derived where every other figure is: by folding the log, in the core.
  const log = useMemo(() => tradeLog(state), [state]);
  const waiting = useMemo(() => plansAwaitingADecision(state), [state]);

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
      {/* Beneath the Plans awaiting a decision, because it is what gets read
          rather than acted on — and above the account, because a review starts
          with the Trades and only then asks what they did to the Balance. */}
      <TradeLog rows={log} />
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
