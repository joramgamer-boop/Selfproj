import { createBackups } from './backups';
import { backupText } from './core/backup';
import { fixedClock } from './core/clock';
import { deriveState } from './core/state';
import type { TradeTrackerEvent } from './core/events';
import { createMemoryEventStore } from './storage/memoryEventStore';
import type { Downloads, ExportFile } from './storage/downloads';
import type { EventStore } from './storage/eventStore';
import type { RecordResult, TradeTracker } from './useTradeTracker';
import { bytesOf, deposit, evidenceAttached, planCreated, positionClosed, positionOpened, screenshot } from './test/events';

/**
 * The order files are written in is what lives in `createBackups`, and it is
 * the one thing about it that cannot be proven by folding a log. These tests
 * watch the two seams either side of it: what the browser was handed, and what
 * the store holds afterwards.
 */

const clock = fixedClock('2026-05-04T12:30:00.000Z');
const openedAt = '2026-01-03T09:00:00.000Z';

const populated: TradeTrackerEvent[] = [
  deposit(500, '2026-01-01T09:00:00.000Z'),
  planCreated({ at: '2026-01-02T09:00:00.000Z' }),
  positionOpened(openedAt),
  positionClosed({ at: '2026-01-04T09:00:00.000Z', openedAt }),
  evidenceAttached({ at: '2026-01-04T09:05:00.000Z' }),
];

function savesFiles(): Downloads & { readonly saved: ExportFile[] } {
  const saved: ExportFile[] = [];
  return {
    saved,
    save: async (file) => {
      saved.push(file);
    },
  };
}

/** A tracker over a fixed log, recording straight into the store beneath it. */
function trackerOver(store: EventStore, log: TradeTrackerEvent[]): TradeTracker {
  return {
    status: 'ready',
    state: deriveState(log),
    log,
    record: async (): Promise<RecordResult> => ({ outcome: 'recorded' }),
    openEvidence: (id) => store.readEvidence(id),
  };
}

function backupsOver(log: TradeTrackerEvent[], evidence = new Map<string, Blob>()) {
  const store = createMemoryEventStore(log, evidence);
  const downloads = savesFiles();
  return { store, evidence, downloads, backups: createBackups(store, downloads, clock, trackerOver(store, log)) };
}

describe('taking a Backup', () => {
  it('hands over the whole log with its screenshots inside it', async () => {
    const { backups, downloads } = backupsOver(
      [...populated],
      new Map([['shot-1', screenshot([1, 2, 3])]]),
    );

    expect(await backups.backUp()).toEqual({ outcome: 'done' });
    const [file] = downloads.saved;
    expect(file.filename).toBe('trade-tracker-backup-2026-05-04T12-30.json');
    expect(JSON.parse(file.text)).toMatchObject({
      events: populated,
      evidence: [{ id: 'shot-1', type: 'image/png' }],
    });
  });

  it('refuses to write a file of nothing', async () => {
    const { backups, downloads } = backupsOver([]);

    expect(await backups.backUp()).toMatchObject({ outcome: 'rejected' });
    expect(downloads.saved).toEqual([]);
  });

  it('backs the log up even where a screenshot has gone missing from the store', async () => {
    // The picture is worth having; the rest of the log is worth incomparably
    // more, and refusing over one lost blob would leave the trader with none.
    const { backups, downloads } = backupsOver([...populated]);

    expect(await backups.backUp()).toEqual({ outcome: 'done' });
    expect(JSON.parse(downloads.saved[0].text)).toMatchObject({ evidence: [] });
  });
});

describe('exporting the CSV', () => {
  it('refuses while no Trade has closed', async () => {
    const { backups, downloads } = backupsOver([deposit(500, '2026-01-01T09:00:00.000Z')]);

    expect(await backups.exportCsv()).toMatchObject({ outcome: 'rejected' });
    expect(downloads.saved).toEqual([]);
  });
});

describe('restoring a Backup', () => {
  const file = (text: string) => new File([text], 'backup.json', { type: 'application/json' });

  it('writes the screenshots the Backup carried', async () => {
    const { backups, store } = backupsOver([]);
    const text = backupText(populated, [{ id: 'shot-1', type: 'image/png', bytes: new Uint8Array([1, 2, 3]) }], '2026-05-01T09:00:00.000Z');

    expect(await backups.restore(file(text))).toEqual({ outcome: 'done' });

    const stored = await store.readEvidence('shot-1');
    expect(stored).not.toBeNull();
    expect(await bytesOf(stored!)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('writes nothing at all onto a device that already holds a log', async () => {
    // The screenshots go down before the events do, so a refusal that came
    // after them would already have written over the proof a Trade on this
    // device was standing on — under ids the incoming file chose.
    const { backups, evidence } = backupsOver(
      [...populated],
      new Map([['shot-1', screenshot([9, 9, 9])]]),
    );
    const text = backupText(populated, [{ id: 'shot-1', type: 'image/png', bytes: new Uint8Array([1, 2, 3]) }], '2026-05-01T09:00:00.000Z');

    expect(await backups.restore(file(text))).toMatchObject({
      outcome: 'rejected',
      reason: expect.stringMatching(/already holds a log/i),
    });

    expect(await bytesOf(evidence.get('shot-1')!)).toEqual(new Uint8Array([9, 9, 9]));
  });

  it('writes nothing when the file is not a Backup', async () => {
    const { backups, evidence } = backupsOver([]);

    expect(await backups.restore(new File(['not json'], 'trades.csv', { type: 'text/csv' }))).toMatchObject(
      { outcome: 'rejected' },
    );
    expect(evidence.size).toBe(0);
  });
});
