import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { fixedClock } from './core/clock';
import { sequentialIds } from './core/ids';
import { createMemoryEventStore } from './storage/memoryEventStore';
import type { EventStore } from './storage/eventStore';
import type { Downloads, ExportFile } from './storage/downloads';
import type { DurableStorage } from './storage/durability';
import type { TradeTrackerEvent } from './core/events';
import {
  breakeven,
  bytesOf,
  closedTrades,
  day,
  deposit,
  evidenceAttached,
  planAbandoned,
  planCreated,
  positionClosed,
  positionOpened,
  screenshot,
  stopMoved,
  withdrawal,
} from './test/events';
import { toDateTimeInput } from './format';

const clock = fixedClock('2026-05-04T12:30:00.000Z');
const durable: DurableStorage = { request: async () => 'durable' };

/**
 * A Downloads that keeps what it was handed. Saving a file is the browser's
 * business and cannot be asserted on, so the tests watch the seam instead.
 */
function savesFiles(): Downloads & { readonly saved: ExportFile[] } {
  const saved: ExportFile[] = [];
  return {
    saved,
    save: async (file) => {
      saved.push(file);
    },
  };
}

function renderApp(log: TradeTrackerEvent[] = [], evidence = new Map<string, Blob>()) {
  // The screenshots beside the log, so a test can ask what the store is
  // actually holding rather than what the screen claims it is.
  const store = createMemoryEventStore(log, evidence);
  const downloads = savesFiles();
  const view = render(
    <App
      store={store}
      clock={clock}
      ids={sequentialIds()}
      durableStorage={durable}
      downloads={downloads}
    />,
  );
  return { log, evidence, downloads, store, view };
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
    render(<App store={createMemoryEventStore(log)} clock={clock} ids={sequentialIds()} durableStorage={durable} downloads={savesFiles()} />);

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
      ...inner,
      append: async (events) => {
        await held;
        await inner.append(events);
      },
    };
    render(<App store={slowStore} clock={clock} ids={sequentialIds()} durableStorage={durable} downloads={savesFiles()} />);

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
        downloads={savesFiles()}
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
        downloads={savesFiles()}
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
        downloads={savesFiles()}
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
    expect(screen.queryByRole('listitem', { name: /plan/i })).not.toBeInTheDocument();

    await user.type(
      screen.getByLabelText(/why are you doing it anyway/i),
      'Swing low is there; taking it.',
    );
    await user.click(screen.getByRole('button', { name: /create plan anyway/i }));

    const plan = await screen.findByRole('listitem', { name: /plan/i });
    expect(plan).toHaveTextContent(/violation — the stop stays inside the liquidation buffer/i);
    expect(plan).toHaveTextContent('Swing low is there; taking it.');
    expect(log).toContainEqual(
      expect.objectContaining({
        type: 'PlanCreated',
        violations: [
          { ruleId: 'liquidation-buffer', reason: 'Swing low is there; taking it.' },
        ],
      }),
    );
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
    expect(await screen.findAllByLabelText(/open position/i)).toHaveLength(1);

    await user.type(
      screen.getByLabelText(/why are you doing it anyway/i),
      'Hedge against the first.',
    );
    await user.click(screen.getByRole('button', { name: /open as position anyway/i }));

    const positions = await screen.findAllByLabelText(/open position/i);
    expect(positions).toHaveLength(2);
    expect(positions[1]).toHaveTextContent(/violation — one position at a time/i);
    await waitFor(() =>
      expect(log).toContainEqual(
        expect.objectContaining({
          type: 'PositionOpened',
          planId: 'plan-2',
          violations: [{ ruleId: 'one-position-at-a-time', reason: 'Hedge against the first.' }],
        }),
      ),
    );
  });
});

describe('abandoning a Plan', () => {
  // Freshly built per test: the store appends to the array it is handed.
  const sized = () => [
    deposit(500, '2026-01-01T09:00:00.000Z'),
    planCreated({ at: '2026-01-02T09:00:00.000Z' }),
  ];

  async function pickReason(reason: RegExp) {
    await userEvent.setup().click(await screen.findByRole('button', { name: reason }));
  }

  it('records the skip against the Plan in one tap, and says what it was for', async () => {
    const { log } = renderApp(sized());

    await pickReason(/price ran away/i);

    await waitFor(() =>
      expect(log).toContainEqual({
        type: 'PlanAbandoned',
        at: '2026-05-04T12:30:00.000Z',
        planId: 'plan-1',
        reason: 'price ran away',
      }),
    );
    const plan = screen.getByRole('listitem', { name: /plan/i });
    expect(plan).toHaveTextContent(/abandoned/i);
    expect(plan).toHaveTextContent(/price ran away/i);
    // Still on the log, and no longer something that can be traded.
    expect(screen.queryByRole('button', { name: /open as position/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /not taking it/i })).not.toBeInTheDocument();
  });

  it('offers the four reasons the framework allows and nothing else', async () => {
    renderApp(sized());
    const reasons = await screen.findByRole('group', { name: /why you are not taking it/i });

    expect(
      within(reasons)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['No valid Stop', 'Risk too large to size', 'Price ran away', 'Changed my mind']);
  });
});

describe('moving the Stop on a live Position', () => {
  const live = () => [
    deposit(500, '2026-01-01T09:00:00.000Z'),
    planCreated({ at: '2026-01-02T09:00:00.000Z' }),
    positionOpened('2026-01-03T09:00:00.000Z'),
  ];

  async function moveStopTo(price: string) {
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/move the stop to/i), price);
    await user.click(screen.getByRole('button', { name: /^move the stop$/i }));
  }

  it('tightens the Stop in one action and shows where it now stands', async () => {
    const { log } = renderApp(live());

    await moveStopTo('98');

    const position = await screen.findByLabelText(/open position/i);
    // The Stop shown is the one that will fire, and the one the Plan was
    // sized at is named as such beside it — the Trade is measured against
    // that one however far this Stop is trailed.
    expect(position).toHaveTextContent(/stop 98/i);
    expect(position).toHaveTextContent(/original stop 96/i);
    await waitFor(() =>
      expect(log).toContainEqual({
        type: 'StopMoved',
        at: '2026-05-04T12:30:00.000Z',
        planId: 'plan-1',
        stopPrice: 98,
        violations: [],
      }),
    );
  });

  it('leaves 1R where the Plan sized it, however far the Stop is trailed', async () => {
    renderApp(live());

    await moveStopTo('98');
    await screen.findByText(/original stop 96/i);
    await moveStopTo('101');

    const position = await screen.findByLabelText(/open position/i);
    expect(position).toHaveTextContent(/stop 101/i);
    // The Risk committed at entry, still the denominator (ADR-0001).
    expect(position).toHaveTextContent('$10.00');
  });

  it('blocks a widening, then records the Override as a Violation', async () => {
    const { log } = renderApp(live());
    const user = userEvent.setup();

    await moveStopTo('94');

    const block = await screen.findByLabelText(/blocked by a rule/i);
    expect(block).toHaveTextContent(/a stop tightens, never widens/i);
    expect(await screen.findByLabelText(/open position/i)).toHaveTextContent(/stop 96/i);
    expect(log).toHaveLength(3);

    await user.type(
      screen.getByLabelText(/why are you doing it anyway/i),
      'Wick took me out; the level below is the real one.',
    );
    await user.click(screen.getByRole('button', { name: /move the stop anyway/i }));

    const position = await screen.findByLabelText(/open position/i);
    expect(position).toHaveTextContent(/stop 94/i);
    expect(position).toHaveTextContent(/violation — a stop tightens, never widens/i);
    await waitFor(() =>
      expect(log).toContainEqual(
        expect.objectContaining({
          type: 'StopMoved',
          stopPrice: 94,
          violations: [
            {
              ruleId: 'stop-never-widens',
              reason: 'Wick took me out; the level below is the real one.',
            },
          ],
        }),
      ),
    );
  });

  it('says so when the Stop is asked to move where it already is', async () => {
    const { log } = renderApp(live());

    await moveStopTo('96');

    expect(await screen.findByText(/the stop is already there/i)).toBeInTheDocument();
    expect(log).toHaveLength(3);
  });
});

describe('what the account says about itself', () => {
  it('shows Peak Balance and no Drawdown while the Balance is at its peak', async () => {
    renderApp([deposit(1000, '2026-01-01T09:00:00.000Z')]);

    expect(await screen.findByLabelText(/peak balance/i)).toHaveTextContent('$1,000.00');
    expect(screen.getByLabelText(/^drawdown$/i)).toHaveTextContent('0.0%');
  });

  it('keeps Peak Balance and Drawdown on screen once the Balance has fallen', async () => {
    renderApp([
      deposit(1000, '2026-01-01T09:00:00.000Z'),
      withdrawal(250, '2026-02-01T09:00:00.000Z'),
    ]);

    expect(await screen.findByLabelText(/^balance$/i)).toHaveTextContent('$750.00');
    expect(screen.getByLabelText(/peak balance/i)).toHaveTextContent('$1,000.00');
    expect(screen.getByLabelText(/^drawdown$/i)).toHaveTextContent('25.0%');
  });
});

describe('recording a Withdrawal', () => {
  async function recordWithdrawal(amount: string) {
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/withdrawal amount/i), amount);
    await user.click(screen.getByRole('button', { name: /record withdrawal/i }));
  }

  // Deposited 500 and traded up to 1250, so there is profit to take and the
  // account has doubled: the one shape of Withdrawal no Rule warns about.
  const doubled = () => [
    deposit(500, '2026-01-01T09:00:00.000Z'),
    planCreated({ at: '2026-01-02T09:00:00.000Z' }),
    positionOpened('2026-01-03T09:00:00.000Z'),
    positionClosed({
      at: '2026-01-04T09:00:00.000Z',
      openedAt: '2026-01-03T09:00:00.000Z',
      exitPrice: 400,
      bestPrice: 400,
      fees: 0,
    }),
  ];

  it('takes it off the Balance and shows it in the Ledger as a debit', async () => {
    renderApp(doubled());

    await recordWithdrawal('300');

    expect(await screen.findByLabelText(/^balance$/i)).toHaveTextContent('$950.00');
    const entries = screen.getAllByRole('listitem', { name: /ledger entry/i });
    expect(entries.at(0)).toHaveTextContent('Withdrawal');
    expect(entries.at(0)).toHaveTextContent('-$300.00');
  });

  it('says nothing when the Withdrawal comes out of profit on a doubled account', async () => {
    renderApp(doubled());

    await recordWithdrawal('300');

    await screen.findAllByRole('listitem', { name: /ledger entry/i });
    expect(screen.queryByLabelText(/warning/i)).not.toBeInTheDocument();
  });

  it('warns while the amount is still being typed, before anything is recorded', async () => {
    const { log } = renderApp(doubled());
    const before = log.length;

    await userEvent.setup().type(await screen.findByLabelText(/withdrawal amount/i), '900');

    expect(await screen.findByLabelText(/warning/i)).toHaveTextContent(/out of the base itself/i);
    expect(log).toHaveLength(before);
  });

  it('records it anyway, and flags the row with the Rule it broke for good', async () => {
    const { log } = renderApp(doubled());

    await recordWithdrawal('900');

    expect(await screen.findByLabelText(/^balance$/i)).toHaveTextContent('$350.00');
    expect(screen.getAllByRole('listitem', { name: /ledger entry/i }).at(0)).toHaveTextContent(
      /never the base/i,
    );
    expect(log).toContainEqual(
      expect.objectContaining({
        type: 'Withdrawal',
        amount: 900,
        warnings: ['withdrawal-never-touches-the-base'],
      }),
    );
  });

  it('warns about a Withdrawal before the account has doubled, and still records it', async () => {
    const { log } = renderApp([deposit(500, '2026-01-01T09:00:00.000Z')]);

    await recordWithdrawal('100');

    expect(await screen.findByLabelText(/^balance$/i)).toHaveTextContent('$400.00');
    await waitFor(() =>
      expect(log).toContainEqual(
        expect.objectContaining({
          type: 'Withdrawal',
          warnings: ['withdrawal-never-touches-the-base', 'withdrawal-waits-for-the-double'],
        }),
      ),
    );
  });

  it('refuses an amount that is not an amount, and records nothing', async () => {
    const { log } = renderApp(doubled());
    const before = log.length;

    await recordWithdrawal('0');

    expect(await screen.findByText(/greater than zero/i)).toBeInTheDocument();
    expect(log).toHaveLength(before);
  });
});

describe('the Drawdown tripwire', () => {
  // 1000 down to 800: exactly a fifth, and the tripwire fires.
  const trippedUp = () => [
    deposit(1000, '2026-01-01T09:00:00.000Z'),
    withdrawal(200, '2026-02-01T09:00:00.000Z'),
  ];

  async function fillPlan() {
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/entry price/i), '100');
    await user.type(screen.getByLabelText(/^stop$/i), '96');
    await user.type(screen.getByLabelText(/leverage/i), '5');
    await user.type(screen.getByLabelText(/liquidation price/i), '80');
  }

  it('says where the account stands before a Plan is even attempted', async () => {
    renderApp(trippedUp());

    const banner = await screen.findByLabelText(/drawdown tripwire/i);
    expect(banner).toHaveTextContent(/20.0%/);
    expect(banner).toHaveTextContent(/review/i);
  });

  it('blocks a new Plan until the log review is acknowledged', async () => {
    renderApp(trippedUp());
    await fillPlan();
    await userEvent.setup().click(screen.getByRole('button', { name: /create plan/i }));

    expect(await screen.findByLabelText(/blocked by a rule/i)).toHaveTextContent(
      /review the log at a 20% drawdown/i,
    );
    expect(screen.queryByRole('listitem', { name: /plan/i })).not.toBeInTheDocument();
  });

  it('lets the Plan through once the review is acknowledged, and records the review', async () => {
    const { log } = renderApp(trippedUp());
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /reviewed the log/i }));

    await waitFor(() =>
      expect(log).toContainEqual(expect.objectContaining({ type: 'DrawdownReviewAcknowledged' })),
    );
    expect(screen.queryByLabelText(/drawdown tripwire/i)).not.toBeInTheDocument();

    await fillPlan();
    await user.click(screen.getByRole('button', { name: /create plan/i }));

    expect(await screen.findByRole('listitem', { name: /plan/i })).toBeInTheDocument();
  });

  it('keeps the Drawdown on screen after the review, because it is still there', async () => {
    renderApp(trippedUp());

    await userEvent.setup().click(await screen.findByRole('button', { name: /reviewed the log/i }));

    await waitFor(() =>
      expect(screen.queryByLabelText(/drawdown tripwire/i)).not.toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/^drawdown$/i)).toHaveTextContent('20.0%');
  });

  it('takes an Override instead, and records the Violation on the Plan', async () => {
    const { log } = renderApp(trippedUp());
    const user = userEvent.setup();

    await fillPlan();
    await user.click(screen.getByRole('button', { name: /create plan/i }));
    await screen.findByLabelText(/blocked by a rule/i);

    await user.type(screen.getByLabelText(/why are you doing it anyway/i), 'Read it on the way in.');
    await user.click(screen.getByRole('button', { name: /create plan anyway/i }));

    const plan = await screen.findByRole('listitem', { name: /plan/i });
    expect(plan).toHaveTextContent(/violation — review the log at a 20% drawdown/i);
    await waitFor(() =>
      expect(log).toContainEqual(
        expect.objectContaining({
          type: 'PlanCreated',
          violations: [{ ruleId: 'drawdown-review', reason: 'Read it on the way in.' }],
        }),
      ),
    );
  });
});

describe('the Trade log', () => {
  const funded = deposit(500, '2026-01-01T09:00:00.000Z');
  const openedAt = '2026-01-03T09:00:00.000Z';

  /** A winner closed on the 4th, then a Plan skipped on the 6th. */
  const history = () => [
    funded,
    planCreated({ at: '2026-01-02T09:00:00.000Z', id: 'plan-1' }),
    positionOpened(openedAt, 'plan-1'),
    positionClosed({
      at: '2026-01-04T09:00:00.000Z',
      planId: 'plan-1',
      openedAt,
      exitPrice: 110,
      bestPrice: 114,
      fees: 1,
    }),
    planCreated({ at: '2026-01-05T09:00:00.000Z', id: 'plan-2' }),
    planAbandoned({ at: '2026-01-06T09:00:00.000Z', planId: 'plan-2' }),
  ];

  /** The rows of the log, newest first, as they stand on screen. */
  async function logRows() {
    const log = await screen.findByRole('region', { name: /trade log/i });
    return within(log).getAllByRole('listitem', { name: /trade|abandoned plan/i });
  }

  it('scrolls the whole history — Trades and Abandoned Plans alike — newest first', async () => {
    renderApp(history());

    const rows = await logRows();
    expect(rows[0]).toHaveAttribute('aria-label', expect.stringMatching(/^Abandoned Plan/));
    expect(rows[0]).toHaveTextContent(/price ran away/i);
    expect(rows[1]).toHaveAttribute('aria-label', expect.stringMatching(/^Trade/));
  });

  it('says what a Trade came to in R, what it kept, and how it ended', async () => {
    renderApp(history());

    const [, trade] = await logRows();
    // $24 net on $10 of Risk, having kept ten of the fourteen dollars on offer.
    expect(trade).toHaveTextContent('+2.40R');
    expect(trade).toHaveTextContent('71%');
    expect(trade).toHaveTextContent('$10.00');
    expect(trade).toHaveTextContent(/take-profit hit/i);
  });

  it('shows the Capture Rate on a loser too, so a round-trip is visible at a glance', async () => {
    renderApp([
      funded,
      planCreated({ at: '2026-01-02T09:00:00.000Z' }),
      positionOpened(openedAt),
      positionClosed({
        at: '2026-01-04T09:00:00.000Z',
        openedAt,
        exitPrice: 96,
        bestPrice: 108,
        fees: 0,
        exitReason: 'stop hit',
      }),
    ]);

    const [roundTrip] = await logRows();
    expect(roundTrip).toHaveTextContent('-1.00R');
    // Eight dollars were on offer and four were lost: the whole move handed
    // back, and then the Risk on top of it.
    expect(roundTrip).toHaveTextContent('-50%');
  });

  it('flags a Violation and above-default Risk on the row itself', async () => {
    renderApp([
      funded,
      planCreated({
        at: '2026-01-02T09:00:00.000Z',
        riskFraction: 0.03,
        stopPrice: 85,
        violations: [{ ruleId: 'liquidation-buffer', reason: 'The level is real.' }],
      }),
      positionOpened(openedAt),
      positionClosed({ at: '2026-01-04T09:00:00.000Z', openedAt }),
    ]);

    const [trade] = await logRows();
    expect(trade).toHaveTextContent(/above default risk/i);
    expect(trade).toHaveTextContent(/violation/i);
    expect(trade).toHaveTextContent(/the level is real/i);
  });

  it('opens one Trade on everything logged against it, notes and Stop moves and all', async () => {
    renderApp([
      funded,
      planCreated({ at: '2026-01-02T09:00:00.000Z' }),
      positionOpened(openedAt),
      stopMoved({ at: '2026-01-03T11:00:00.000Z', stopPrice: 100 }),
      positionClosed({
        at: '2026-01-04T09:00:00.000Z',
        openedAt,
        notes: 'Took the second push.',
        scaledOut: true,
      }),
    ]);
    const [trade] = await logRows();

    // Nothing of the detail is on the row until it is asked for.
    expect(trade).not.toHaveTextContent(/took the second push/i);

    await userEvent.setup().click(within(trade).getByRole('button', { name: /everything logged/i }));

    expect(trade).toHaveTextContent(/took the second push/i);
    expect(trade).toHaveTextContent(/scaled out/i);
    // Where the Stop was trailed to, beside the one 1R stays fixed at.
    expect(trade).toHaveTextContent('100');
    expect(trade).toHaveTextContent('114');
    expect(trade).toHaveTextContent('$25.00');
  });

  it('reads a Trade stopped out at breakeven as the 0R it was', async () => {
    // The case ADR-0001 keeps 1R fixed to the original Stop for: the Stop was
    // trailed to the entry and hit there. It is neither a win nor a loss, and
    // a signed "+0.00R" would file it under the first.
    renderApp([
      funded,
      planCreated({ at: '2026-01-02T09:00:00.000Z' }),
      positionOpened(openedAt),
      stopMoved({ at: '2026-01-03T11:00:00.000Z', stopPrice: 100 }),
      positionClosed({
        at: '2026-01-04T09:00:00.000Z',
        openedAt,
        exitPrice: 100,
        bestPrice: 104,
        fees: 0,
        exitReason: 'stop hit',
      }),
    ]);

    const [breakeven] = await logRows();
    expect(breakeven).toHaveTextContent('0.00R');
    expect(breakeven).not.toHaveTextContent('+0.00R');
  });

  it('totals nothing itself — what the log adds up to is gated on 30 Trades', async () => {
    renderApp(history());
    const log = await screen.findByRole('region', { name: /trade log/i });

    // The log reports and never sums. The one place that sums is the
    // statistics panel, and it is shut until 30 Trades have closed (ADR-0002).
    expect(log.textContent).not.toMatch(/win rate|expectancy|average|avg R|equity curve/i);
  });
});

describe('Evidence — a screenshot as proof of the fill', () => {
  const openedAt = '2026-01-03T09:00:00.000Z';
  const closedAt = '2026-01-04T09:00:00.000Z';
  const live = () => [
    deposit(500, '2026-01-01T09:00:00.000Z'),
    planCreated({ at: '2026-01-02T09:00:00.000Z' }),
    positionOpened(openedAt),
  ];
  const traded = () => [...live(), positionClosed({ at: closedAt, openedAt })];
  const evidenced = () => [...traded(), evidenceAttached({ at: closedAt, evidenceId: 'shot-1' })];

  /** The store already holding the screenshot the fixture log points at. */
  function stored(bytes = [1, 2, 3]) {
    return new Map<string, Blob>([['shot-1', screenshot(bytes)]]);
  }

  async function closePosition(file?: File) {
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/exit price/i), '110');
    await user.type(screen.getByLabelText(/^fees$/i), '1');
    await user.type(screen.getByLabelText(/best price/i), '114');
    await user.selectOptions(screen.getByLabelText(/exit reason/i), 'take-profit hit');
    if (file) await user.upload(screen.getByLabelText(/screenshot/i), file);
    await user.click(screen.getByRole('button', { name: /close position/i }));
  }

  /** The Trade's own detail, which is where a screenshot is looked at. */
  async function openTheDetail() {
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: /everything logged/i }));
  }

  it('attaches a screenshot as the Position is closed, and keeps it against the Trade', async () => {
    const { log, evidence } = renderApp(live());

    await closePosition(screenshot());

    await waitFor(() => expect(log).toHaveLength(5));
    expect(log[3]).toMatchObject({ type: 'PositionClosed' });
    expect(log[4]).toMatchObject({ type: 'EvidenceAttached', planId: 'plan-1' });
    // The image itself is in the store, not in the log.
    expect(evidence.size).toBe(1);
    expect(await bytesOf([...evidence.values()][0])).toEqual(new Uint8Array([137, 80, 78, 71]));
  });

  it('fills in no field from the image — the close is judged on what was typed', async () => {
    const { log } = renderApp(live());
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/exit price/i), '110');
    await user.type(screen.getByLabelText(/^fees$/i), '1');
    await user.selectOptions(screen.getByLabelText(/exit reason/i), 'take-profit hit');
    await user.upload(screen.getByLabelText(/screenshot/i), screenshot());
    await user.click(screen.getByRole('button', { name: /close position/i }));

    // A Best Price the screenshot could never have held, so nothing was taken
    // out of it to stand in for the missing figure (ADR-0003).
    expect(await screen.findByRole('alert')).toHaveTextContent(/best price is required/i);
    expect(log).toHaveLength(3);
    expect(await screen.findByLabelText(/open position/i)).toBeInTheDocument();
  });

  it('shows the screenshot on the Trade, once it has one', async () => {
    renderApp(evidenced(), stored());

    await openTheDetail();

    const image = await screen.findByRole('img', { name: /screenshot/i });
    await waitFor(() => expect(image.getAttribute('src')).toMatch(/^blob:/));
  });

  it('attaches a screenshot to a Trade that was logged without one', async () => {
    const { log, evidence } = renderApp(traded());
    await openTheDetail();

    await userEvent.setup().upload(await screen.findByLabelText(/attach a screenshot/i), screenshot());

    await waitFor(() => expect(log).toHaveLength(5));
    expect(log[4]).toMatchObject({ type: 'EvidenceAttached', planId: 'plan-1' });
    expect(await screen.findByRole('img', { name: /screenshot/i })).toBeInTheDocument();
    expect(evidence.size).toBe(1);
  });

  it('replaces the screenshot, and gives up the one it replaced', async () => {
    const { log, evidence } = renderApp(evidenced(), stored());
    await openTheDetail();

    await userEvent
      .setup()
      .upload(await screen.findByLabelText(/replace the screenshot/i), screenshot([7, 7, 7]));

    await waitFor(() => expect(log).toHaveLength(6));
    expect(log[5]).toMatchObject({ type: 'EvidenceAttached' });
    // One screenshot, and it is the new one: the replaced image is not left
    // taking up space nothing can reach.
    expect(evidence.size).toBe(1);
    expect(await bytesOf([...evidence.values()][0])).toEqual(new Uint8Array([7, 7, 7]));
  });

  it('removes the screenshot from the Trade, and drops the image with it', async () => {
    const { log, evidence } = renderApp(evidenced(), stored());
    await openTheDetail();

    await userEvent.setup().click(await screen.findByRole('button', { name: /remove the screenshot/i }));

    await waitFor(() => expect(log).toHaveLength(6));
    expect(log[5]).toMatchObject({ type: 'EvidenceRemoved', planId: 'plan-1' });
    expect(evidence.size).toBe(0);
    expect(await screen.findByLabelText(/attach a screenshot/i)).toBeInTheDocument();
  });

  it('opens the screenshot full size, and closes it again', async () => {
    renderApp(evidenced(), stored());
    await openTheDetail();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /view full size/i }));

    const viewer = await screen.findByRole('dialog', { name: /screenshot/i });
    expect(within(viewer).getByRole('img', { name: /screenshot/i })).toBeInTheDocument();

    await user.click(within(viewer).getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // And back up, closed with the key a desktop reader reaches for.
    await user.click(screen.getByRole('button', { name: /view full size/i }));
    await screen.findByRole('dialog', { name: /screenshot/i });
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('still has the screenshot after a full reload', async () => {
    const { log, evidence } = renderApp(live());
    await closePosition(screenshot());
    await waitFor(() => expect(log).toHaveLength(5));

    cleanup();
    render(
      <App
        store={createMemoryEventStore(log, evidence)}
        clock={clock}
        ids={sequentialIds()}
        durableStorage={durable}
        downloads={savesFiles()}
      />,
    );
    await openTheDetail();

    const image = await screen.findByRole('img', { name: /screenshot/i });
    await waitFor(() => expect(image.getAttribute('src')).toMatch(/^blob:/));
  });

  it('lets a refused file be cleared, so a screenshot can never hold a Position open', async () => {
    const { log, evidence } = renderApp(live());
    // Past the picker's own accept filter, which not every phone honours:
    // whether a file is an image is the core's answer, not the input's.
    const user = userEvent.setup({ applyAccept: false });

    await user.type(await screen.findByLabelText(/exit price/i), '110');
    await user.type(screen.getByLabelText(/^fees$/i), '1');
    await user.type(screen.getByLabelText(/best price/i), '114');
    await user.selectOptions(screen.getByLabelText(/exit reason/i), 'take-profit hit');
    await user.upload(
      screen.getByLabelText(/screenshot/i),
      new File(['exit 110'], 'notes.txt', { type: 'text/plain' }),
    );
    await user.click(screen.getByRole('button', { name: /close position/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/not an image/i);
    expect(log).toHaveLength(3);

    // The way out: drop the picture and close anyway. Without it the wrong
    // file rides along on every submit and the Position never closes.
    await user.click(screen.getByRole('button', { name: /clear the screenshot/i }));
    await user.click(screen.getByRole('button', { name: /close position/i }));

    await waitFor(() => expect(log).toHaveLength(4));
    expect(await screen.findByLabelText(/^balance$/i)).toHaveTextContent('$524.00');
    expect(evidence.size).toBe(0);
  });
});

describe('backing the log up, and getting it back', () => {
  const openedAt = '2026-01-03T09:00:00.000Z';

  /** `count` closed Trades, each on a Plan of its own. */
  const closedTrades = (count: number) =>
    Array.from({ length: count }, (_, index) => `plan-${index + 1}`).flatMap((id) => [
      planCreated({ at: '2026-01-02T09:00:00.000Z', id }),
      positionOpened(openedAt, id),
      positionClosed({ at: '2026-01-04T09:00:00.000Z', openedAt, planId: id }),
    ]);

  const funded = deposit(5000, '2026-01-01T09:00:00.000Z');

  it('always says how many Trades have closed since the last backup', async () => {
    renderApp([funded, ...closedTrades(3)]);

    expect(await screen.findByLabelText(/trades since the last backup/i)).toHaveTextContent(
      '3 Trades since your last Backup',
    );
  });

  it('hands over a CSV of the closed Trades', async () => {
    const { downloads } = renderApp([funded, ...closedTrades(1)]);

    await userEvent.setup().click(await screen.findByRole('button', { name: /export trades as csv/i }));

    await waitFor(() => expect(downloads.saved).toHaveLength(1));
    const [file] = downloads.saved;
    expect(file.filename).toMatch(/\.csv$/);
    expect(file.text).toContain('R-multiple');
    expect(file.text).toContain('take-profit hit');
  });

  it('clears the count once a backup is taken', async () => {
    const { downloads } = renderApp([funded, ...closedTrades(3)]);

    await userEvent.setup().click(await screen.findByRole('button', { name: /back up everything/i }));

    await waitFor(() => expect(downloads.saved).toHaveLength(1));
    expect(downloads.saved[0].filename).toMatch(/\.json$/);
    expect(await screen.findByLabelText(/trades since the last backup/i)).toHaveTextContent(
      /nothing has closed since/i,
    );
  });

  it('blocks a new Plan at ten Trades since the last backup, and opens up once one is taken', async () => {
    const user = userEvent.setup();
    renderApp([funded, ...closedTrades(10)]);

    await user.type(await screen.findByLabelText(/entry price/i), '100');
    await user.type(screen.getByLabelText(/^stop$/i), '96');
    await user.type(screen.getByLabelText(/leverage/i), '5');
    await user.type(screen.getByLabelText(/liquidation price/i), '80');
    await user.click(screen.getByRole('button', { name: /create plan/i }));

    expect(await screen.findByText(/back up after 10 trades/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back up everything/i }));
    await user.click(screen.getByRole('button', { name: /create plan/i }));

    expect(await screen.findByRole('button', { name: /open as position/i })).toBeInTheDocument();
  });

  it('restores a backup onto a fresh device, screenshots and all', async () => {
    const user = userEvent.setup();
    // A whole log: money in, a Trade closed with proof of the fill, and a Plan
    // that was skipped. What is being tested is that every one of them comes
    // back, not that a Deposit does.
    const backed = renderApp(
      [
        deposit(500, '2026-01-01T09:00:00.000Z'),
        planCreated({ at: '2026-01-02T09:00:00.000Z' }),
        positionOpened(openedAt),
        positionClosed({ at: '2026-01-04T09:00:00.000Z', openedAt }),
        evidenceAttached({ at: '2026-01-04T09:05:00.000Z' }),
        planCreated({ at: '2026-01-05T09:00:00.000Z', id: 'plan-2' }),
        planAbandoned({ at: '2026-01-05T10:00:00.000Z', planId: 'plan-2' }),
      ],
      new Map([['shot-1', screenshot([1, 2, 3])]]),
    );

    await user.click(await screen.findByRole('button', { name: /back up everything/i }));
    await waitFor(() => expect(backed.downloads.saved).toHaveLength(1));
    const file = new File([backed.downloads.saved[0].text], 'backup.json', {
      type: 'application/json',
    });
    // A device with a log on it is not offered the picker: restoring is an
    // append, and appending one history onto another leaves neither readable.
    expect(screen.queryByLabelText(/restore from a backup/i)).not.toBeInTheDocument();
    backed.view.unmount();

    const fresh = renderApp();
    await user.upload(await screen.findByLabelText(/restore from a backup/i), file);

    // Every derived figure, on a device that has never seen any of it.
    expect(await screen.findByLabelText(/^balance$/i)).toHaveTextContent('$524.00');
    expect(await screen.findByText('+2.40R')).toBeInTheDocument();
    // The skip too: it moved no money, so a Backup is the only file it could
    // ever have travelled in.
    expect(screen.getByText(/abandoned — price ran away/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/trades since the last backup/i)).toHaveTextContent(
      /nothing has closed since/i,
    );

    // And the screenshot, which is the part a CSV could never carry.
    const stored = await fresh.store.readEvidence('shot-1');
    expect(stored).not.toBeNull();
    expect(await bytesOf(stored!)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('refuses a file that is not a backup, and records nothing', async () => {
    const { log } = renderApp();

    // Past the picker's own accept filter, which not every phone honours.
    await userEvent
      .setup({ applyAccept: false })
      .upload(
        await screen.findByLabelText(/restore from a backup/i),
        new File(['Closed at,Direction'], 'trades.csv', { type: 'text/csv' }),
      );

    expect(await screen.findByRole('alert')).toHaveTextContent(/not a backup/i);
    expect(log).toEqual([]);
  });
});

describe('the statistics gate', () => {
  const funded = deposit(1000, '2026-01-01T09:00:00.000Z');
  const statistics = () => within(screen.getByRole('region', { name: /^statistics$/i }));

  it('counts the closed Trades toward the 30 the statistics wait for', async () => {
    renderApp([
      funded,
      ...closedTrades({ exitPrice: 108, bestPrice: 110 }, { exitPrice: 96, bestPrice: 100 }),
      // A skip is in the log for good, and counts toward nothing.
      planCreated({ at: day(5), id: 'skipped' }),
      planAbandoned({ at: day(6), planId: 'skipped' }),
    ]);

    expect(await screen.findByLabelText(/trades logged/i)).toHaveTextContent(
      '2 / 30 Trades logged',
    );
  });

  it('shows nothing about performance at 29 closed Trades', async () => {
    renderApp([funded, ...closedTrades(...breakeven(29))]);

    expect(await screen.findByLabelText(/trades logged/i)).toHaveTextContent(
      '29 / 30 Trades logged',
    );
    // Nowhere on the screen, not merely nowhere in the panel: each of these is
    // a figure the log adds up to, and none of them may be rendered from a
    // sample this short — however the screen is arranged (ADR-0002).
    const gated = [
      /win rate/i,
      /expectancy/i,
      /average win/i,
      /average loss/i,
      /capture rate/i,
      /fee drag/i,
      /max drawdown/i,
    ];
    for (const figure of gated) {
      expect(screen.queryByLabelText(figure)).not.toBeInTheDocument();
    }
    expect(screen.queryByRole('img', { name: /equity curve/i })).not.toBeInTheDocument();
  });

  /**
   * The 30th Trade, and the figures the whole log exists for. Twenty-six that
   * came to nothing, then the hand-worked four: +2R, +1R, −1R and a breakeven,
   * with no fees anywhere.
   */
  const thirty = [
    funded,
    ...closedTrades(
      ...breakeven(26),
      { exitPrice: 108, bestPrice: 110 },
      { exitPrice: 104, bestPrice: 104 },
      { exitPrice: 96, bestPrice: 100, violations: [{ ruleId: 'liquidation-buffer', reason: 'Went anyway.' }] },
      { exitPrice: 100, bestPrice: 108 },
    ),
  ];

  it('answers the question the log exists for at the 30th Trade', async () => {
    renderApp(thirty);

    expect(await screen.findByLabelText(/trades logged/i)).toHaveTextContent('30 Trades logged');
    const panel = statistics();
    // Every figure the ticket asks for, on screen. What each of them comes to
    // is settled at seam 1; what this seam is here for is that the gate opened
    // and the right figure reached the right label.
    expect(panel.getByLabelText(/win rate/i)).toHaveTextContent('6.7%');
    expect(panel.getByLabelText(/expectancy per trade/i)).toHaveTextContent('+0.07R');
    expect(panel.getByLabelText(/average win/i)).toBeInTheDocument();
    expect(panel.getByLabelText(/average loss/i)).toBeInTheDocument();
    expect(panel.getByLabelText(/average capture rate/i)).toBeInTheDocument();
    expect(panel.getByLabelText(/fee drag/i)).toBeInTheDocument();
    expect(panel.getByLabelText(/max drawdown/i)).toBeInTheDocument();
    expect(panel.getByRole('img', { name: /equity curve/i })).toBeInTheDocument();
  });

  it('sets the Trades that broke a Rule beside the ones that did not', async () => {
    renderApp(thirty);
    await screen.findByLabelText(/trades logged/i);

    const tradesIn = (name: RegExp) =>
      within(screen.getByRole('row', { name })).getAllByRole('cell')[0].textContent;

    // The one Trade taken through an overridden Rule, against the twenty-nine
    // that broke none — each cohort with its own figures beside it.
    expect(tradesIn(/broke a rule/i)).toBe('1');
    expect(tradesIn(/broke none/i)).toBe('29');
  });
});
