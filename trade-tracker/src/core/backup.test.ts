import { BACKUP_FORMAT, BACKUP_VERSION, backupText, readBackup } from './backup';
import { evaluate } from './commands';
import { fixedClock } from './clock';
import { sequentialIds } from './ids';
import { deriveState, emptyState } from './state';
import {
  deposit,
  evidenceAttached,
  planAbandoned,
  planCreated,
  positionClosed,
  positionOpened,
  riskDefaultChanged,
  stopMoved,
  withdrawal,
} from '../test/events';
import type { TradeTrackerEvent } from './events';

const at = '2026-05-04T12:30:00.000Z';
const openedAt = '2026-01-03T09:00:00.000Z';

/**
 * A log with one of everything in it: money in and out, a Plan taken and
 * trailed and closed, a Plan skipped, a screenshot, a settings change. What a
 * Backup has to survive is the whole of it, not a Deposit.
 */
const populated: TradeTrackerEvent[] = [
  deposit(1000, '2026-01-01T09:00:00.000Z'),
  riskDefaultChanged(0.025, '2026-01-01T10:00:00.000Z'),
  planCreated({ at: '2026-01-02T09:00:00.000Z', riskFraction: 0.03 }),
  positionOpened(openedAt),
  stopMoved({ at: '2026-01-03T10:00:00.000Z', stopPrice: 98 }),
  positionClosed({
    at: '2026-01-04T09:00:00.000Z',
    openedAt,
    closedAt: '2026-01-04T08:00:00.000Z',
    notes: 'Entered late, "chased" it.',
  }),
  evidenceAttached({ at: '2026-01-04T09:05:00.000Z' }),
  planCreated({ at: '2026-01-05T09:00:00.000Z', id: 'plan-2' }),
  planAbandoned({ at: '2026-01-05T10:00:00.000Z', planId: 'plan-2' }),
  withdrawal(50, '2026-01-06T09:00:00.000Z', ['withdrawal-waits-for-the-double']),
];

const screenshotBytes = { id: 'shot-1', type: 'image/png', bytes: new Uint8Array([137, 80, 78, 71]) };

describe('a Backup', () => {
  it('names itself, so a file picked by mistake can be told apart from one', () => {
    expect(JSON.parse(backupText([], [], at))).toMatchObject({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      at,
    });
  });

  it('carries the whole event log', () => {
    const read = readBackup(backupText(populated, [], at));

    expect(read).toMatchObject({ outcome: 'read', events: populated });
  });

  it('carries the Evidence, bytes and type alike', () => {
    const read = readBackup(backupText(populated, [screenshotBytes], at));

    expect(read).toMatchObject({ outcome: 'read', evidence: [screenshotBytes] });
  });

  it('restores to exactly the state it was taken from', () => {
    const read = readBackup(backupText(populated, [screenshotBytes], at));
    if (read.outcome !== 'read') throw new Error(read.reason);

    // Every figure the app shows, on both sides: Balance, base, the Plans, the
    // Trades and everything folded onto them. A field lost in the file would
    // come back as a wrong number rather than as a crash.
    expect(deriveState(read.events)).toEqual(deriveState(populated));
  });

  it('restores through the command that writes it, to the same state again', () => {
    const read = readBackup(backupText(populated, [screenshotBytes], at));
    if (read.outcome !== 'read') throw new Error(read.reason);

    const restore = evaluate(
      emptyState,
      { type: 'RestoreBackup', events: read.events },
      { clock: fixedClock(at), ids: sequentialIds() },
    );
    if (restore.outcome !== 'append') throw new Error('the Backup was refused');

    // Everything but the count of Trades since the last Backup, which the
    // restore itself puts back to zero — this log now exists as a file.
    const restored = deriveState(restore.events);
    expect(restored).toMatchObject({ ...deriveState(populated), tradesSinceBackup: 0 });
  });

  it('survives a note carrying quotes and a line break', () => {
    const chatty = [
      deposit(500, '2026-01-01T09:00:00.000Z'),
      planCreated({ at: '2026-01-02T09:00:00.000Z' }),
      positionOpened(openedAt),
      positionClosed({
        at: '2026-01-04T09:00:00.000Z',
        openedAt,
        notes: 'Entered late, "chased" it.\nSame leak again.',
      }),
    ];

    expect(readBackup(backupText(chatty, [], at))).toMatchObject({ events: chatty });
  });
});

describe('reading a file that is not one', () => {
  it('refuses something that is not even JSON', () => {
    expect(readBackup('Closed at,Direction\n2026-01-04,long')).toEqual({
      outcome: 'unreadable',
      reason: expect.stringMatching(/not a backup/i),
    });
  });

  it('refuses JSON that is not a Backup', () => {
    expect(readBackup('{"trades":[]}')).toMatchObject({ outcome: 'unreadable' });
  });

  it('refuses a Backup written by a version this one cannot read', () => {
    const ahead = JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION + 1,
      at,
      events: [],
      evidence: [],
    });

    expect(readBackup(ahead)).toEqual({
      outcome: 'unreadable',
      reason: expect.stringMatching(/newer version/i),
    });
  });

  it('refuses one whose events are not a list of events', () => {
    const wrong = JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      at,
      events: 'all of them',
      evidence: [],
    });

    expect(readBackup(wrong)).toMatchObject({ outcome: 'unreadable' });
  });

  it('refuses one whose Evidence is not a stored screenshot', () => {
    const wrong = JSON.stringify({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      at,
      events: [],
      evidence: [{ id: 'shot-1' }],
    });

    expect(readBackup(wrong)).toMatchObject({ outcome: 'unreadable' });
  });

  it('reads a Backup with no Evidence in it — a log without screenshots is a whole log', () => {
    expect(readBackup(backupText(populated, [], at))).toMatchObject({
      outcome: 'read',
      evidence: [],
    });
  });
});
