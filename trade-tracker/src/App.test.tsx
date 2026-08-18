import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { fixedClock } from './core/clock';
import { createMemoryEventStore } from './storage/memoryEventStore';
import type { EventStore } from './storage/eventStore';
import type { DurableStorage } from './storage/durability';
import type { TradeTrackerEvent } from './core/events';
import { deposit } from './test/events';

const clock = fixedClock('2026-05-04T12:30:00.000Z');
const durable: DurableStorage = { request: async () => 'durable' };

function renderApp(log: TradeTrackerEvent[] = []) {
  const store = createMemoryEventStore(log);
  const view = render(<App store={store} clock={clock} durableStorage={durable} />);
  return { log, view };
}

async function recordDeposit(amount: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText(/deposit amount/i), amount);
  await user.click(screen.getByRole('button', { name: /record deposit/i }));
}

describe('the account screen', () => {
  it('shows a zero Balance when nothing has been recorded', async () => {
    renderApp();

    expect(await screen.findByLabelText(/^balance$/i)).toHaveTextContent('$0.00');
    expect(screen.getByText(/nothing recorded yet/i)).toBeInTheDocument();
  });

  it('shows the Balance derived from an existing Ledger', async () => {
    renderApp([
      deposit(500, '2026-01-01T09:00:00.000Z'),
      deposit(250, '2026-02-01T09:00:00.000Z'),
    ]);

    expect(await screen.findByLabelText(/^balance$/i)).toHaveTextContent('$750.00');
  });

  it('records a Deposit and shows it in the Ledger against the new Balance', async () => {
    renderApp();

    await recordDeposit('30');

    expect(await screen.findByLabelText(/^balance$/i)).toHaveTextContent('$30.00');
    const entry = screen.getByRole('listitem');
    expect(entry).toHaveTextContent('Deposit');
    expect(entry).toHaveTextContent('$30.00');
  });

  it('adds a Deposit to the Balance already on record', async () => {
    renderApp([deposit(500, '2026-01-01T09:00:00.000Z')]);

    await recordDeposit('250');

    expect(await screen.findByLabelText(/^balance$/i)).toHaveTextContent('$750.00');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('keeps the Balance after a full reload', async () => {
    const { log, view } = renderApp();
    await recordDeposit('30');
    await screen.findByRole('listitem');

    view.unmount();
    render(<App store={createMemoryEventStore(log)} clock={clock} durableStorage={durable} />);

    expect(await screen.findByLabelText(/^balance$/i)).toHaveTextContent('$30.00');
    expect(screen.getByRole('listitem')).toHaveTextContent('Deposit');
  });

  it('refuses a Deposit that is not an amount above zero, and records nothing', async () => {
    const { log } = renderApp();

    await recordDeposit('0');

    expect(await screen.findByRole('alert')).toHaveTextContent(/greater than zero/i);
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    expect(log).toEqual([]);
  });

  it('records one Deposit when the button is tapped twice before the first has saved', async () => {
    const log: TradeTrackerEvent[] = [];
    const inner = createMemoryEventStore(log);
    let saved = () => {};
    const held = new Promise<void>((resolve) => {
      saved = resolve;
    });
    const slowStore: EventStore = {
      read: () => inner.read(),
      append: async (events) => {
        await held;
        await inner.append(events);
      },
    };
    render(<App store={slowStore} clock={clock} durableStorage={durable} />);

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/deposit amount/i), '30');
    const button = screen.getByRole('button', { name: /record deposit/i });
    await user.click(button);
    await user.click(button);
    saved();

    await waitFor(() => expect(log).toHaveLength(1));
    expect(await screen.findByLabelText(/^balance$/i)).toHaveTextContent('$30.00');
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('clears the amount once a Deposit is recorded', async () => {
    renderApp();

    await recordDeposit('30');

    expect(await screen.findByLabelText(/deposit amount/i)).toHaveValue(null);
  });
});

describe('how durable the Ledger is', () => {
  function renderWith(durableStorage: DurableStorage) {
    render(<App store={createMemoryEventStore()} clock={clock} durableStorage={durableStorage} />);
    return screen.findByLabelText(/storage durability/i);
  }

  it('says the log is safe once the browser has granted persistent storage', async () => {
    expect(await renderWith({ request: async () => 'durable' })).toHaveTextContent(
      /keep this log until you delete it/i,
    );
  });

  it('warns that the browser may clear the log when persistence is refused', async () => {
    const notice = await renderWith({ request: async () => 'evictable' });

    expect(notice).toHaveTextContent(/may clear this log/i);
    expect(notice).toHaveTextContent(/home screen/i);
  });

  it('still says where it stands when the request fails outright', async () => {
    // Silence here would be the worst of the three answers: the notice simply
    // never appears, and nothing tells the trader the log can be evicted.
    expect(await renderWith({ request: () => Promise.reject(new Error('nope')) })).toHaveTextContent(
      /can be cleared/i,
    );
  });

  it('asks the browser to keep the log once, when the app opens', async () => {
    let asked = 0;
    await renderWith({
      request: async () => {
        asked += 1;
        return 'durable';
      },
    });

    expect(asked).toBe(1);
  });

  it('claims nothing about durability until the browser has answered', async () => {
    render(
      <App
        store={createMemoryEventStore()}
        clock={clock}
        durableStorage={{ request: () => new Promise(() => {}) }}
      />,
    );

    await screen.findByLabelText(/^balance$/i);
    expect(screen.queryByLabelText(/storage durability/i)).not.toBeInTheDocument();
  });
});
