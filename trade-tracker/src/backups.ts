import { backupText, readBackup, type EvidenceBytes } from './core/backup';
import type { Clock } from './core/clock';
import { whyNotRestorable } from './core/commands';
import { tradesCsv } from './core/csv';
import { nothingToExport, type ExportFormat } from './core/export';
import { isUnusedLog, type DerivedState } from './core/state';
import type { Downloads, ExportFile } from './storage/downloads';
import type { EventStore } from './storage/eventStore';
import type { RecordResult, TradeTracker } from './useTradeTracker';

/** What came of asking for a file, or of handing one back. */
export type BackupResult =
  | { readonly outcome: 'done' }
  | { readonly outcome: 'rejected'; readonly reason: string };

/**
 * Getting the log off this device, and back onto one.
 *
 * The three things a screen may do about durability, in one capability: take
 * the CSV of closed Trades, take the Backup, and put a Backup back. Like
 * `EvidenceActions` they travel together, because they are one subject and one
 * panel renders all three.
 */
export interface Backups {
  /**
   * Whether a Backup could be restored here at all. The same question the core
   * refuses on, asked in advance so the screen offers a way in only where
   * there is one — a picker that always says no is worse than no picker.
   */
  readonly restorable: boolean;
  /** The closed Trades as a spreadsheet reads them. */
  exportCsv(): Promise<BackupResult>;
  /** The whole log and its screenshots, as one file. */
  backUp(): Promise<BackupResult>;
  restore(file: File): Promise<BackupResult>;
}

/**
 * Where storage, the clock and the export formats meet — the same seam
 * `useTradeTracker` is, for the part of the app that deals in files. It
 * decides nothing: every refusal here is one the core gave.
 *
 * The order of operations is the whole of what lives here, and it is the same
 * order Evidence is written in. Exporting hands the file over *first*, and only
 * once the browser has it does the Exported event go into the log — the other
 * way round would clear the Backup Rule with a file that failed to save, which
 * is precisely the state the Rule exists to prevent. Restoring asks the core
 * whether the Backup can go on this device *before* it writes a single
 * screenshot, because a refused restore that had already written them would
 * have written over the proof a Trade here was standing on.
 */
export function createBackups(
  store: EventStore,
  downloads: Downloads,
  clock: Clock,
  tracker: TradeTracker,
): Backups {
  const { state, log } = tracker;

  /** Hands a file over, then writes down that it exists. */
  const exported = async (file: ExportFile, format: ExportFormat): Promise<BackupResult> => {
    try {
      await downloads.save(file);
    } catch {
      return { outcome: 'rejected', reason: 'Could not save that file — nothing was exported.' };
    }

    return recorded(await tracker.record({ type: 'RecordExport', format }));
  };

  return {
    restorable: isUnusedLog(state),

    exportCsv: async () => {
      const nothing = nothingToExport(state, 'csv');
      if (nothing) return { outcome: 'rejected', reason: nothing };

      return await exported(
        {
          filename: named('trades', 'csv', clock),
          mimeType: 'text/csv;charset=utf-8',
          text: tradesCsv(state),
        },
        'csv',
      );
    },

    backUp: async () => {
      const nothing = nothingToExport(state, 'json');
      if (nothing) return { outcome: 'rejected', reason: nothing };

      let evidence: readonly EvidenceBytes[];
      try {
        evidence = await evidenceOf(store, state);
      } catch {
        return {
          outcome: 'rejected',
          reason: 'Could not read the screenshots on this device — nothing was exported.',
        };
      }

      return await exported(
        {
          filename: named('backup', 'json', clock),
          mimeType: 'application/json',
          text: backupText(log, evidence, clock.now().toISOString()),
        },
        'json',
      );
    },

    restore: async (file) => {
      let text: string;
      try {
        text = await file.text();
      } catch {
        return { outcome: 'rejected', reason: 'That file could not be read.' };
      }

      const read = readBackup(text);
      if (read.outcome !== 'read') return { outcome: 'rejected', reason: read.reason };

      // Asked before anything is written. The command asks again — this is the
      // ask that keeps a refused restore from having already overwritten a
      // screenshot on the way to being refused.
      const refusal = whyNotRestorable(state, read.events);
      if (refusal) return { outcome: 'rejected', reason: refusal };

      // The screenshots before the events that name them, exactly as attaching
      // one writes them: a restored Trade must never come back claiming proof
      // this device cannot produce.
      try {
        for (const image of read.evidence) {
          await store.putEvidence(image.id, new Blob([image.bytes], { type: image.type }));
        }
      } catch {
        return {
          outcome: 'rejected',
          reason: 'Could not write the screenshots to this device — nothing was restored.',
        };
      }

      return recorded(await tracker.record({ type: 'RestoreBackup', events: read.events }));
    },
  };
}

/**
 * Every screenshot the log still stands on, by the ids the Trades name.
 *
 * One that the store has lost is left out rather than refused: the Backup of
 * everything else is worth far more than the picture, and the Trade it belongs
 * to already knows how to say its screenshot is not in this copy of the log.
 */
async function evidenceOf(store: EventStore, state: DerivedState): Promise<EvidenceBytes[]> {
  const ids = state.trades.flatMap((trade) => (trade.evidenceId === null ? [] : [trade.evidenceId]));

  const found: EvidenceBytes[] = [];
  for (const id of ids) {
    const image = await store.readEvidence(id);
    if (image === null) continue;
    found.push({ id, type: image.type, bytes: new Uint8Array(await image.arrayBuffer()) });
  }
  return found;
}

/**
 * What the file is called: what it is, and when it was taken, to the minute.
 * The date is in the name so a folder of Backups sorts into the order they
 * were made and the latest one is obvious at a glance.
 */
function named(what: string, extension: string, clock: Clock): string {
  const stamp = clock.now().toISOString().slice(0, 16).replaceAll(':', '-');
  return `trade-tracker-${what}-${stamp}.${extension}`;
}

/** A command's outcome as this panel reads one. */
function recorded(result: RecordResult): BackupResult {
  switch (result.outcome) {
    case 'recorded':
      return { outcome: 'done' };
    case 'rejected':
      return { outcome: 'rejected', reason: result.reason };
    case 'blocked':
      // No Rule blocks either of these commands, and none could: one is
      // written after the file exists, and the other is how a lost log comes
      // back. Reported rather than swallowed, so a Rule added later that did
      // block one says so instead of failing silently.
      return {
        outcome: 'rejected',
        reason: result.verdicts.map((verdict) => verdict.explanation).join(' '),
      };
  }
}
