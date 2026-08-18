import { evaluate, type CreatePlan, type OpenPosition } from './commands';
import { fixedClock } from './clock';
import { sequentialIds } from './ids';
import { RULES } from './rules';
import { deriveState } from './state';
import { deposit, planCreated, positionClosed, positionOpened } from '../test/events';

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
    });
  });

  it('gives every Rule an id of its own, since a Violation names one', () => {
    expect(new Set(RULES.map((rule) => rule.id)).size).toBe(RULES.length);
  });
});

describe('the Rule that a Plan needs a Stop', () => {
  it('blocks a Plan with no Stop, naming the Rule', () => {
    const evaluation = evaluate(sized, { ...aLong, stopPrice: Number.NaN }, context());

    expect(evaluation).toMatchObject({
      outcome: 'blocked',
      verdicts: [{ ruleId: 'stop-required' }],
    });
  });

  it('blocks a Plan whose Stop field was left empty', () => {
    // A blank number field arrives as zero, which is not a Stop — it is the
    // absence of one.
    expect(evaluate(sized, { ...aLong, stopPrice: 0 }, context())).toMatchObject({
      outcome: 'blocked',
      verdicts: [expect.objectContaining({ ruleId: 'stop-required' })],
    });
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

  it('cannot rescue a Plan with no Stop, because there is no size to record', () => {
    // The one block an Override cannot get past. Without a Stop there is no
    // distance to solve a Notional from and no 1R to measure the result in,
    // so there is no Plan for the reason to be attached to.
    expect(
      evaluate(sized, { ...aLong, stopPrice: 0, override: { reason } }, context()),
    ).toMatchObject({ outcome: 'rejected', reason: expect.stringMatching(/stop must be/i) });
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
