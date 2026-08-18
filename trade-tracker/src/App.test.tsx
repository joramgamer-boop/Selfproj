import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { fixedClock } from './core/clock';
import { sequentialIds } from './core/ids';
import { createMemoryEventStore } from './storage/memoryEventStore';
import type { EventStore } from './storage/eventStore';
import type { DurableStorage } from './storage/durability';
import type { TradeTrackerEvent } from './core/events';
import { deposit, planCreated, positionOpened } from './test/events';
import { toDateTimeInput } from './format';

const clock = fixedClock('2026-05-04T12:30:00.000Z');
const durable: DurableStorage = { request: async () => 'durable' };

function renderApp(log: TradeTrackerEvent[] = []) {
  const store = createMemoryEventStore(log);
  const view = render(
    <App store={store} clock={clock} ids={sequentialIds()} durableStorage={durable} />,
  );
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
    render(<App store={createMemoryEventStore(log)} clock={clock} ids={sequentialIds()} durableStorage={durable} />);

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
    render(<App store={slowStore} clock={clock} ids={sequentialIds()} durableStorage={durable} />);

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
    render(
      <App
        store={createMemoryEventStore()}
        clock={clock}
        ids={sequentialIds()}
        durableStorage={durableStorage}
      />,
    );
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
        ids={sequentialIds()}
        durableStorage={{ request: () => new Promise(() => {}) }}
      />,
    );

    await screen.findByLabelText(/^balance$/i);
    expect(screen.queryByLabelText(/storage durability/i)).not.toBeInTheDocument();
  });
});

describe('sizing a Plan', () => {
  const aLong = { entry: '100', stop: '96', leverage: '5', liquidation: '80' };

  async function fillPlan(fields: Partial<typeof aLong> = {}) {
    const user = userEvent.setup();
    const values = { ...aLong, ...fields };
    await user.type(await screen.findByLabelText(/entry price/i), values.entry);
    await user.type(screen.getByLabelText(/^stop$/i), values.stop);
    await user.type(screen.getByLabelText(/leverage/i), values.leverage);
    await user.type(screen.getByLabelText(/liquidation price/i), values.liquidation);
  }

  async function createPlan() {
    await userEvent.setup().click(screen.getByRole('button', { name: /create plan/i }));
  }

  it('solves the Notional from the Stop and shows the dollar Risk', async () => {
    renderApp([deposit(500, '2026-01-01T09:00:00.000Z')]);

    await fillPlan();

    expect(await screen.findByLabelText(/^risk$/i)).toHaveTextContent('$10.00');
    expect(screen.getByLabelText(/^notional$/i)).toHaveTextContent('$250.00');
    expect(screen.getByLabelText(/^margin$/i)).toHaveTextContent('$50.00');
  });

  it('resizes the Notional when the Stop widens, holding the dollar Risk still', async () => {
    renderApp([deposit(500, '2026-01-01T09:00:00.000Z')]);

    await fillPlan({ stop: '92' });

    expect(await screen.findByLabelText(/^risk$/i)).toHaveTextContent('$10.00');
    expect(screen.getByLabelText(/^notional$/i)).toHaveTextContent('$125.00');
  });

  it('offers nothing to type a Notional into', async () => {
    renderApp([deposit(500, '2026-01-01T09:00:00.000Z')]);
    await screen.findByLabelText(/entry price/i);

    const typeable = screen
      .getAllByRole('spinbutton')
      .concat(screen.queryAllByRole('textbox'))
      .map((field) => field.getAttribute('aria-label') ?? field.id);

    expect(typeable.join(' ')).not.toMatch(/notional|position size/i);
  });

  it('says that isolated margin is assumed', async () => {
    renderApp([deposit(500, '2026-01-01T09:00:00.000Z')]);

    expect(await screen.findByText(/isolated margin/i)).toBeInTheDocument();
  });

  it('shows no ROE figure anywhere', async () => {
    renderApp([deposit(500, '2026-01-01T09:00:00.000Z')]);
    await fillPlan();
    await createPlan();

    expect(document.body.textContent).not.toMatch(/\broe\b|return on margin/i);
  });

  it('records the Plan and shows it after a reload', async () => {
    const { log, view } = renderApp([deposit(500, '2026-01-01T09:00:00.000Z')]);
    await fillPlan();
    await createPlan();
    await screen.findByRole('listitem', { name: /plan/i });

    view.unmount();
    render(
      <App
        store={createMemoryEventStore(log)}
        clock={clock}
        ids={sequentialIds()}
        durableStorage={durable}
      />,
    );

    const plan = await screen.findByRole('listitem', { name: /plan/i });
    expect(plan).toHaveTextContent(/long/i);
    expect(plan).toHaveTextContent('$10.00');
    expect(plan).toHaveTextContent('$250.00');
  });

  it('refuses a Plan it cannot size and records nothing', async () => {
    const { log } = renderApp([deposit(500, '2026-01-01T09:00:00.000Z')]);

    await fillPlan({ stop: '104' });
    await createPlan();

    expect(await screen.findByRole('alert')).toHaveTextContent(/stop on a long must sit below/i);
    expect(log).toHaveLength(1);
  });

  it('will not size against an empty Ledger', async () => {
    renderApp();

    await fillPlan();

    expect(await screen.findByRole('alert')).toHaveTextContent(/record a deposit first/i);
  });
});

describe('the Risk default', () => {
  it('offers the Plan the Risk that settings hold', async () => {
    renderApp([deposit(500, '2026-01-01T09:00:00.000Z')]);

    expect(await screen.findByLabelText(/^risk, % of balance$/i)).toHaveValue(2);
  });

  it('records a change to the default as a timestamped event', async () => {
    const { log } = renderApp([deposit(500, '2026-01-01T09:00:00.000Z')]);
    const user = userEvent.setup();

    const field = await screen.findByLabelText(/default risk/i);
    await user.clear(field);
    await user.type(field, '3');
    await user.click(screen.getByRole('button', { name: /save default/i }));

    await waitFor(() =>
      expect(log).toContainEqual({
        type: 'RiskDefaultChanged',
        at: '2026-05-04T12:30:00.000Z',
        riskFraction: 0.03,
      }),
    );
  });

  it('flags a Plan that used more Risk than the default', async () => {
    const { log } = renderApp([deposit(500, '2026-01-01T09:00:00.000Z')]);
    const user = userEvent.setup();

    const risk = await screen.findByLabelText(/^risk, % of balance$/i);
    await user.clear(risk);
    await user.type(risk, '3');
    await user.type(screen.getByLabelText(/entry price/i), '100');
    await user.type(screen.getByLabelText(/^stop$/i), '96');
    await user.type(screen.getByLabelText(/leverage/i), '5');
    await user.type(screen.getByLabelText(/liquidation price/i), '80');
    await user.click(screen.getByRole('button', { name: /create plan/i }));

    const plan = await screen.findByRole('listitem', { name: /plan/i });
    expect(plan).toHaveTextContent(/above default risk/i);
    expect(plan).toHaveTextContent('$15.00');
    expect(log).toHaveLength(2);
  });
});

describe('the Risk default, once changed', () => {
  it('is what the next Plan starts at', async () => {
    renderApp([deposit(500, '2026-01-01T09:00:00.000Z')]);
    const user = userEvent.setup();

    const setting = await screen.findByLabelText(/default risk/i);
    await user.clear(setting);
    await user.type(setting, '3');
    await user.click(screen.getByRole('button', { name: /save default/i }));

    await waitFor(() =>
      expect(screen.getByLabelText(/^risk, % of balance$/i)).toHaveValue(3),
    );
  });
});

describe('taking a Plan live and closing it', () => {
  // Freshly built per test: the store appends to the array it is handed, so a
  // shared one would carry the last test's Trade into the next.
  const sized = () => [
    deposit(500, '2026-01-01T09:00:00.000Z'),
    planCreated({ at: '2026-01-02T09:00:00.000Z' }),
  ];
  const live = () => [...sized(), positionOpened('2026-01-03T09:00:00.000Z')];

  async function openPosition() {
    await userEvent.setup().click(screen.getByRole('button', { name: /open as position/i }));
  }

  /** Everything the record needs: a winner exited at $110 for $1 of fees. */
  async function closePosition(fields: Record<string, string> = {}) {
    const user = userEvent.setup();
    const values = { exit: '110', fees: '1', best: '114', ...fields };
    // A blank field is typed by not typing into it.
    if (values.exit) await user.type(await screen.findByLabelText(/exit price/i), values.exit);
    if (values.fees) await user.type(screen.getByLabelText(/^fees$/i), values.fees);
    if (values.best) await user.type(screen.getByLabelText(/best price/i), values.best);
    await user.selectOptions(screen.getByLabelText(/exit reason/i), 'take-profit hit');
    await user.click(screen.getByRole('button', { name: /close position/i }));
  }

  it('shows the open Position, with the Plan it was sized as', async () => {
    renderApp(live());

    const position = await screen.findByLabelText(/open position/i);
    expect(position).toHaveTextContent(/long/i);
    expect(position).toHaveTextContent('$10.00');
    expect(position).toHaveTextContent('96');
  });

  it('opens a Plan as a Position in one action', async () => {
    const { log } = renderApp(sized());
    await screen.findByRole('listitem', { name: /plan/i });

    await openPosition();

    expect(await screen.findByLabelText(/open position/i)).toBeInTheDocument();
    expect(log).toContainEqual({
      type: 'PositionOpened',
      at: '2026-05-04T12:30:00.000Z',
      planId: 'plan-1',
      violations: [],
    });
  });


  it('closes a winner, moving the Balance by the P&L net of fees', async () => {
    const { log } = renderApp(live());

    await closePosition();

    expect(await screen.findByLabelText(/^balance$/i)).toHaveTextContent('$524.00');
    expect(screen.queryByLabelText(/open position/i)).not.toBeInTheDocument();
    const entries = screen.getAllByRole('listitem');
    expect(entries.some((entry) => /trade/i.test(entry.textContent ?? ''))).toBe(true);
    expect(screen.getByText('$24.00')).toBeInTheDocument();
    // Left alone, the hold is what the clock said it was.
    expect(log[3]).toMatchObject({
      at: '2026-05-04T12:30:00.000Z',
      openedAt: '2026-01-03T09:00:00.000Z',
      closedAt: '2026-05-04T12:30:00.000Z',
    });
  });

  it('will not close without a Best Price, and records nothing', async () => {
    const { log } = renderApp(live());

    await closePosition({ best: '' });

    expect(await screen.findByRole('alert')).toHaveTextContent(/best price is required/i);
    expect(log).toHaveLength(3);
  });

  it('offers the five Exit Reasons and nothing else', async () => {
    renderApp(live());

    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      'Choose…',
      'Stop hit',
      'Manual exit in profit',
      'Manual exit at a loss',
      'Take-profit hit',
      'Liquidated',
    ]);
  });

  it('keeps notes and a scaled exit on the one Trade', async () => {
    const { log } = renderApp(live());
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/exit price/i), '110');
    await user.click(screen.getByLabelText(/scaled out/i));
    await user.type(screen.getByLabelText(/^fees$/i), '1');
    await user.type(screen.getByLabelText(/best price/i), '114');
    await user.selectOptions(screen.getByLabelText(/exit reason/i), 'take-profit hit');
    await user.type(screen.getByLabelText(/notes/i), 'Scaled out into strength.');
    await user.click(screen.getByRole('button', { name: /close position/i }));

    await waitFor(() => expect(log).toHaveLength(4));
    expect(log[3]).toMatchObject({
      type: 'PositionClosed',
      exitPrice: 110,
      scaledOut: true,
      notes: 'Scaled out into strength.',
    });
  });

  it('takes a corrected close time, so a late entry cannot fabricate the hold', async () => {
    const { log } = renderApp(live());
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /correct the record/i }));
    const closedAt = screen.getByLabelText(/closed at/i);
    await user.clear(closedAt);
    // The field speaks local time, so the instant to correct to is written the
    // way the trader would see it wherever the test runs.
    await user.type(closedAt, toDateTimeInput('2026-01-03T15:00:00.000Z'));
    await closePosition();

    await waitFor(() => expect(log).toHaveLength(4));
    expect(log[3]).toMatchObject({
      at: '2026-05-04T12:30:00.000Z',
      closedAt: '2026-01-03T15:00:00.000Z',
    });
  });
});

describe('hitting a Rule and going through it anyway', () => {
  const funded = () => [deposit(500, '2026-01-01T09:00:00.000Z')];

  it('blocks a Stop past halfway to liquidation, then records the Override as a Violation', async () => {
    const { log } = renderApp(funded());
    const user = userEvent.setup();

    // Entry 100, liquidation 80: a Stop at 85 sits 75% of the way there.
    await user.type(await screen.findByLabelText(/entry price/i), '100');
    await user.type(screen.getByLabelText(/^stop$/i), '85');
    await user.type(screen.getByLabelText(/leverage/i), '5');
    await user.type(screen.getByLabelText(/liquidation price/i), '80');
    await user.click(screen.getByRole('button', { name: /create plan/i }));

    const block = await screen.findByLabelText(/blocked by a rule/i);
    expect(block).toHaveTextContent(/liquidation buffer/i);
    expect(block).toHaveTextContent('75%');
    expect(log).toHaveLength(1);

    await user.type(
      screen.getByLabelText(/why are you doing it anyway/i),
      'Swing low is there; taking it.',
    );
    await user.click(screen.getByRole('button', { name: /create plan anyway/i }));

    const plan = await screen.findByRole('listitem', { name: /plan/i });
    expect(plan).toHaveTextContent(/violation/i);
    expect(plan).toHaveTextContent('Swing low is there; taking it.');
    expect(log[1]).toMatchObject({
      type: 'PlanCreated',
      violations: [
        { ruleId: 'liquidation-buffer', reason: 'Swing low is there; taking it.' },
      ],
    });
  });

  it('blocks a second Position while one is live, and takes a reason for it', async () => {
    const { log } = renderApp([
      ...funded(),
      planCreated({ at: '2026-01-02T09:00:00.000Z' }),
      positionOpened('2026-01-03T09:00:00.000Z'),
      planCreated({ at: '2026-01-02T10:00:00.000Z', id: 'plan-2' }),
    ]);
    const user = userEvent.setup();

    // Still offered, unlike a Plan already live: the block is the core's to
    // give, along with the way past it.
    await user.click(await screen.findByRole('button', { name: /open as position/i }));

    expect(await screen.findByLabelText(/blocked by a rule/i)).toHaveTextContent(
      /one position at a time/i,
    );
    expect(log).toHaveLength(4);

    await user.type(
      screen.getByLabelText(/why are you doing it anyway/i),
      'Hedge against the first.',
    );
    await user.click(screen.getByRole('button', { name: /open as position anyway/i }));

    await waitFor(() => expect(log).toHaveLength(5));
    expect(log[4]).toMatchObject({
      type: 'PositionOpened',
      planId: 'plan-2',
      violations: [{ ruleId: 'one-position-at-a-time', reason: 'Hedge against the first.' }],
    });
    const positions = await screen.findAllByLabelText(/open position/i);
    expect(positions).toHaveLength(2);
    expect(positions[1]).toHaveTextContent(/violation — one position at a time/i);
  });
});
