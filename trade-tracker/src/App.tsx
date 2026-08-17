import BalanceHeadline from './components/BalanceHeadline';
import DepositForm from './components/DepositForm';
import LedgerList from './components/LedgerList';
import type { Clock } from './core/clock';
import type { EventStore } from './storage/eventStore';
import { useTradeTracker } from './useTradeTracker';
import './App.css';

interface AppProps {
  store: EventStore;
  clock: Clock;
}

export default function App({ store, clock }: AppProps) {
  const { status, state, record } = useTradeTracker(store, clock);

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
      <BalanceHeadline balance={state.balance} />
      <DepositForm onRecord={(amount) => record({ type: 'RecordDeposit', amount })} />
      <LedgerList entries={state.ledger} />
    </main>
  );
}
