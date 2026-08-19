import { evaluate, type CreatePlan, type MoveStop, type OpenPosition } from './commands';
import { fixedClock } from './clock';
import { sequentialIds } from './ids';
import { RULES } from './rules';
import { deriveState } from './state';
import { deposit, planCreated, positionClosed, positionOpened, stopMoved } from '../test/events';

const clock = fixedClock('2026-05-04T12:30:00.000Z');
const context = () => ({ clock, ids: sequentialIds() });

const funded = deposit(500, '2026-01-01T09:00:00.000Z');
const sized = deriveState([funded]);

/** The Plan every test below varies one figure of: a long with a 4% Stop. */
const aLong: CreatePlan = {
  type: 'CreatePlan',
  direction: 'long',
  entryPrice: 100,
  stopPrice: 96,
  leverage: 5,
  liquidationPrice: 80,
  riskFraction: 0.02,
};

describe('the Rules themselves', () => {
  it('carries an id, a name and a before-or-after-the-fact classification on each', () => {
    expect(RULES).not.toHaveLength(0);
    RULES.forEach((rule) => {
      expect(rule.id).toEqual(expect.any(String));
      expect(rule.name).toEqual(expect.any(String));
      expect(['pre-fact', 'post-fact']).toContain(rule.timing);
      expect(rule.overridable).toEqual(expect.any(Boolean));
    });
  });

  it('leaves a way through every Rule but the one that would leave nothing to record', () => {
    expect(RULES.filter((rule) => !rule.overridable).map((rule) => rule.id)).toEqual([
      'stop-required',
    ]);
  });

  it('gives every Rule an id of its own, since a Violation names one', () => {
    expect(new Set(RULES.map((rule) => rule.id)).size).toBe(RULES.length);
  });
});

describe('the Rule that a Plan needs a Stop', () => {
  it('refuses a Plan with no Stop, in the Rule’s words', () => {
    expect(evaluate(sized, { ...aLong, stopPrice: Number.NaN }, context())).toEqual({
      outcome: 'rejected',
      reason: expect.stringMatching(/without a stop there is no 1R/i),
    });
  });

  it('refuses a Plan whose Stop field was left empty', () => {
    // A blank number field arrives as zero, which is not a Stop — it is the
    // absence of one.
    expect(evaluate(sized, { ...aLong, stopPrice: 0 }, context())).toMatchObject({
      outcome: 'rejected',
    });
  });

  it('offers no way through, because there would be no Plan to record', () => {
    // The one Rule an Override cannot answer. Offering the box would put the
    // trader in a dead end at the worst possible moment.
    expect(RULES.find((candidate) => candidate.id === 'stop-required')).toMatchObject({
      overridable: false,
    });
    expect(
      evaluate(sized, { ...aLong, stopPrice: 0, override: { reason: 'No stop, going in.' } }, context()),
    ).toMatchObject({ outcome: 'rejected' });
  });

  it('lets a Plan with a Stop through', () => {
    expect(evaluate(sized, aLong, context())).toMatchObject({ outcome: 'append' });
  });
});

describe('the Liquidation Buffer Rule', () => {
  it('lets a Stop exactly halfway to liquidation through', () => {
    // Entry 100, liquidation 80: halfway is 90 and the Rule allows it.
    expect(evaluate(sized, { ...aLong, stopPrice: 90 }, context())).toMatchObject({
      outcome: 'append',
    });
  });

  it('blocks a Stop a hair past halfway to liquidation', () => {
    expect(evaluate(sized, { ...aLong, stopPrice: 89.9 }, context())).toMatchObject({
      outcome: 'blocked',
      verdicts: [{ ruleId: 'liquidation-buffer' }],
    });
  });

  it('measures the same halfway on a short', () => {
    const aShort: CreatePlan = {
      ...aLong,
      direction: 'short',
      stopPrice: 110,
      liquidationPrice: 120,
    };

    expect(evaluate(sized, aShort, context())).toMatchObject({ outcome: 'append' });
    expect(evaluate(sized, { ...aShort, stopPrice: 110.1 }, context())).toMatchObject({
      outcome: 'blocked',
      verdicts: [{ ruleId: 'liquidation-buffer' }],
    });
  });

  it('says how far the Stop actually sits, so the block is arguable', () => {
    expect(evaluate(sized, { ...aLong, stopPrice: 85 }, context())).toMatchObject({
      verdicts: [{ explanation: expect.stringContaining('75%') }],
    });
  });
});

describe('the Rule that only one Position is open at a time', () => {
  const planned = planCreated({ at: '2026-01-02T09:00:00.000Z' });
  const second = planCreated({ at: '2026-01-02T10:00:00.000Z', id: 'plan-2' });
  const openSecond: OpenPosition = { type: 'OpenPosition', planId: 'plan-2' };

  it('lets the first Position open', () => {
    const state = deriveState([funded, planned]);

    expect(
      evaluate(state, { type: 'OpenPosition', planId: 'plan-1' }, context()),
    ).toMatchObject({ outcome: 'append' });
  });

  it('blocks a second Position while one is live', () => {
    const state = deriveState([
      funded,
      planned,
      positionOpened('2026-01-03T09:00:00.000Z'),
      second,
    ]);

    expect(evaluate(state, openSecond, context())).toMatchObject({
      outcome: 'blocked',
      verdicts: [{ ruleId: 'one-position-at-a-time' }],
    });
  });

  it('lets the next Position open once the first has closed', () => {
    const openedAt = '2026-01-03T09:00:00.000Z';
    const state = deriveState([
      funded,
      planned,
      positionOpened(openedAt),
      positionClosed({ at: '2026-01-03T15:00:00.000Z', openedAt }),
      second,
    ]);

    expect(evaluate(state, openSecond, context())).toMatchObject({ outcome: 'append' });
  });

  it('still refuses to reopen a Plan already live, rather than offering an Override', () => {
    const state = deriveState([funded, planned, positionOpened('2026-01-03T09:00:00.000Z')]);

    expect(
      evaluate(state, { type: 'OpenPosition', planId: 'plan-1' }, context()),
    ).toMatchObject({ outcome: 'rejected', reason: expect.stringMatching(/already live/i) });
  });
});

describe('overriding a block', () => {
  const blocked: CreatePlan = { ...aLong, stopPrice: 85 };
  const reason = 'Wider Stop is the swing low; taking it small.';

  it('records the Plan when a reason is typed', () => {
    expect(evaluate(sized, { ...blocked, override: { reason } }, context())).toMatchObject({
      outcome: 'append',
      events: [{ type: 'PlanCreated', violations: [{ ruleId: 'liquidation-buffer', reason }] }],
    });
  });

  it('is refused when the reason is empty', () => {
    expect(evaluate(sized, { ...blocked, override: { reason: '' } }, context())).toMatchObject({
      outcome: 'rejected',
      reason: expect.stringMatching(/say why/i),
    });
  });

  it('is refused when the reason is nothing but whitespace', () => {
    expect(
      evaluate(sized, { ...blocked, override: { reason: '   ' } }, context()),
    ).toMatchObject({ outcome: 'rejected' });
  });

  it('keeps the reason without the whitespace around it', () => {
    expect(
      evaluate(sized, { ...blocked, override: { reason: `  ${reason}  ` } }, context()),
    ).toMatchObject({ events: [{ violations: [{ reason }] }] });
  });

  it('records no Violation when nothing was blocking', () => {
    expect(evaluate(sized, { ...aLong, override: { reason } }, context())).toMatchObject({
      events: [{ violations: [] }],
    });
  });

  it('does not rescue a Plan the app cannot size at all', () => {
    // The Override answers a Rule; it cannot conjure a Balance to size against.
    expect(
      evaluate(deriveState([]), { ...blocked, override: { reason } }, context()),
    ).toMatchObject({ outcome: 'rejected', reason: expect.stringMatching(/record a deposit/i) });
  });
});

describe('a Violation on the record', () => {
  const reason = 'Second setup was the hedge; taking it anyway.';

  it('stays on the Plan once the log is folded back', () => {
    const evaluation = evaluate(
      sized,
      { ...aLong, stopPrice: 85, override: { reason } },
      context(),
    );

    if (evaluation.outcome !== 'append') throw new Error('expected the Override to be recorded');
    expect(deriveState([funded, ...evaluation.events]).plans[0].violations).toEqual([
      { ruleId: 'liquidation-buffer', reason },
    ]);
  });

  it('survives the fold onto the closed Trade', () => {
    const openedAt = '2026-01-03T09:00:00.000Z';
    const log = [
      funded,
      planCreated({ at: '2026-01-02T09:00:00.000Z' }),
      positionOpened(openedAt),
      planCreated({ at: '2026-01-02T10:00:00.000Z', id: 'plan-2' }),
    ];
    const evaluation = evaluate(
      deriveState(log),
      { type: 'OpenPosition', planId: 'plan-2', override: { reason } },
      context(),
    );

    if (evaluation.outcome !== 'append') throw new Error('expected the Override to be recorded');
    const settled = deriveState([
      ...log,
      ...evaluation.events,
      positionClosed({
        at: '2026-06-01T15:00:00.000Z',
        planId: 'plan-2',
        openedAt: '2026-05-04T12:30:00.000Z',
      }),
    ]);

    expect(settled.trades[0].plan.violations).toEqual([
      { ruleId: 'one-position-at-a-time', reason },
    ]);
  });
});

describe('the Rule that a Stop tightens and never widens', () => {
  const planned = planCreated({ at: '2026-01-02T09:00:00.000Z' });
  const openedAt = '2026-01-03T09:00:00.000Z';
  const live = deriveState([funded, planned, positionOpened(openedAt)]);
  const move = (stopPrice: number): MoveStop => ({
    type: 'MoveStop',
    planId: 'plan-1',
    stopPrice,
  });

  it('lets a Stop tighten toward entry without a block', () => {
    // The long entered at 100 with its Stop at 96. Moving it to 98 halves what
    // is still at risk, which is trade management rather than a rule break.
    expect(evaluate(live, move(98), context())).toMatchObject({ outcome: 'append' });
  });

  it('lets a Stop past the entry through, since that only cuts the risk further', () => {
    // A long's Stop above its entry is locked-in profit, not widening.
    expect(evaluate(live, move(101), context())).toMatchObject({ outcome: 'append' });
  });

  it('blocks a Stop moved away from entry, and offers a way through', () => {
    expect(evaluate(live, move(94), context())).toMatchObject({
      outcome: 'blocked',
      verdicts: [{ ruleId: 'stop-never-widens', overridable: true }],
    });
  });

  it('measures the same widening on a short', () => {
    const short = deriveState([
      funded,
      planCreated({
        at: '2026-01-02T09:00:00.000Z',
        direction: 'short',
        stopPrice: 104,
        liquidationPrice: 120,
      }),
      positionOpened(openedAt),
    ]);

    expect(evaluate(short, move(102), context())).toMatchObject({ outcome: 'append' });
    expect(evaluate(short, move(106), context())).toMatchObject({
      outcome: 'blocked',
      verdicts: [{ ruleId: 'stop-never-widens' }],
    });
  });

  it('judges the move against where the Stop now stands, not where it started', () => {
    const tightened = deriveState([
      funded,
      planned,
      positionOpened(openedAt),
      stopMoved({ at: '2026-01-03T11:00:00.000Z', stopPrice: 99 }),
    ]);

    // 97 is still tighter than the 96 this Plan was sized at, and it is still
    // giving back risk that had already been taken off the table.
    expect(evaluate(tightened, move(97), context())).toMatchObject({
      outcome: 'blocked',
      verdicts: [{ ruleId: 'stop-never-widens' }],
    });
  });

  it('says what the widening would cost, so the block is arguable', () => {
    expect(evaluate(live, move(94), context())).toMatchObject({
      verdicts: [{ explanation: expect.stringMatching(/1R/i) }],
    });
  });

  it('records the widening as a Violation when a reason is typed', () => {
    const reason = 'Wick took me out; the level below is the real invalidation.';
    const evaluation = evaluate(live, { ...move(94), override: { reason } }, context());

    expect(evaluation).toMatchObject({
      outcome: 'append',
      events: [{ type: 'StopMoved', violations: [{ ruleId: 'stop-never-widens', reason }] }],
    });
  });

  it('leaves the Violation on the Plan once the log is folded back', () => {
    const reason = 'Wick took me out; the level below is the real invalidation.';
    const log = [funded, planned, positionOpened(openedAt)];
    const evaluation = evaluate(deriveState(log), { ...move(94), override: { reason } }, context());

    if (evaluation.outcome !== 'append') throw new Error('expected the Override to be recorded');
    expect(deriveState([...log, ...evaluation.events]).plans[0].violations).toEqual([
      { ruleId: 'stop-never-widens', reason },
    ]);
  });

  it('says nothing about a Plan that is not live, since there is no Stop to move', () => {
    expect(evaluate(deriveState([funded, planned]), move(94), context())).toMatchObject({
      outcome: 'rejected',
      reason: expect.stringMatching(/no Position open/i),
    });
  });
});
