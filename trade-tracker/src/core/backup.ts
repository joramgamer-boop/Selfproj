import type { TradeTrackerEvent } from './events';

/**
 * The Backup: the whole event log, with the Evidence beside it, as one file.
 *
 * It is the log rather than a reading of it, and that is the entire point.
 * Every figure this app shows is folded from these events, so a file that
 * holds them holds everything — including the Plans that were skipped, the
 * Violations, and the screenshots, none of which survive a CSV. Restoring is
 * then appending, and the app that reads it back needs to know nothing about
 * what any of it means.
 *
 * The screenshots are in here as base64 rather than beside the file as loose
 * images, because a Backup that is more than one file is a Backup where one of
 * them gets lost. It costs a third of the size, on a file that is saved by
 * hand a few times a month.
 */

/** What the file says it is, so one picked by mistake is refused rather than folded. */
export const BACKUP_FORMAT = 'trade-tracker-backup';

/**
 * The shape of the file, not the app. It goes up only when an older reader
 * would misread a newer file — a reader is expected to refuse a version it
 * does not know rather than guess at it.
 */
export const BACKUP_VERSION = 1;

/** A stored screenshot as the core handles one: the bytes, and what kind of picture they are. */
export interface EvidenceBytes {
  /** The id an `EvidenceAttached` names it by. */
  readonly id: string;
  readonly type: string;
  readonly bytes: Uint8Array<ArrayBuffer>;
}

/** A screenshot as the file holds it. */
interface StoredEvidence {
  readonly id: string;
  readonly type: string;
  readonly image: string;
}

interface BackupFile {
  readonly format: string;
  readonly version: number;
  /** When the Backup was taken. Read by whoever is looking for the latest one. */
  readonly at: string;
  readonly events: readonly TradeTrackerEvent[];
  readonly evidence: readonly StoredEvidence[];
}

/** A file read back, or why it is not a Backup this app can restore from. */
export type ParsedBackup =
  | {
      readonly outcome: 'read';
      readonly events: readonly TradeTrackerEvent[];
      readonly evidence: readonly EvidenceBytes[];
    }
  | { readonly outcome: 'unreadable'; readonly reason: string };

/**
 * The Backup as the text that gets saved. Indented, because a Backup is a file
 * the trader keeps for years and may one day have to look inside — the bytes
 * it costs are nothing beside a screenshot.
 */
export function backupText(
  events: readonly TradeTrackerEvent[],
  evidence: readonly EvidenceBytes[],
  at: string,
): string {
  const file: BackupFile = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    at,
    events,
    evidence: evidence.map((image) => ({
      id: image.id,
      type: image.type,
      image: toBase64(image.bytes),
    })),
  };

  return JSON.stringify(file, null, 2);
}

/**
 * A file back into a log and its screenshots.
 *
 * What it checks is the shape of the file and nothing about what the events
 * mean: whether this log can actually be folded — and so whether it can be
 * written to a store the app has to open again tomorrow — is the restore
 * command's to decide, where every other "can this be recorded" question is
 * decided.
 */
export function readBackup(text: string): ParsedBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return { outcome: 'unreadable', reason: 'That file is not a backup — it is not even JSON.' };
  }

  if (!isRecord(parsed) || parsed.format !== BACKUP_FORMAT) {
    return {
      outcome: 'unreadable',
      reason: 'That file is not a Trade Tracker backup. Look for the one this app wrote.',
    };
  }

  // A file from a newer version is refused rather than guessed at. Half of a
  // log restored is worse than none: the trader still has the file, and the
  // app that wrote it can still read it.
  if (typeof parsed.version !== 'number' || parsed.version > BACKUP_VERSION) {
    return {
      outcome: 'unreadable',
      reason: 'That backup was written by a newer version of this app than the one on this device.',
    };
  }

  if (!Array.isArray(parsed.events)) {
    return { outcome: 'unreadable', reason: 'That backup carries no event log.' };
  }

  const evidence = evidenceOf(parsed.evidence);
  if (evidence === null) {
    return { outcome: 'unreadable', reason: 'The screenshots in that backup could not be read.' };
  }

  // Asserted rather than checked, deliberately, and it is the one place in
  // this module that leans on somebody else: what these events *mean* — and so
  // whether a store can safely be given them — is settled by folding them,
  // which `whyNotRestorable` does before a single one is written. Checking the
  // shape of every event type here as well would be a second, quietly
  // divergent definition of what an event is.
  return { outcome: 'read', events: parsed.events as readonly TradeTrackerEvent[], evidence };
}

/** The screenshots the file holds, or null where they are not screenshots. */
function evidenceOf(value: unknown): readonly EvidenceBytes[] | null {
  // Absent is not broken: a log whose Trades never had a screenshot backs up
  // to a file with nothing in this field.
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;

  const read: EvidenceBytes[] = [];
  for (const image of value as unknown[]) {
    if (!isRecord(image)) return null;
    const { id, type, image: encoded } = image;
    if (typeof id !== 'string' || typeof type !== 'string' || typeof encoded !== 'string') {
      return null;
    }

    const bytes = fromBase64(encoded);
    if (bytes === null) return null;
    read.push({ id, type, bytes });
  }

  return read;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Bytes as base64, a chunk at a time. A screenshot runs to hundreds of
 * kilobytes, and handing that many arguments to `String.fromCharCode` at once
 * overflows the stack on a phone.
 */
function toBase64(bytes: Uint8Array): string {
  const chunk = 8192;
  let binary = '';
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

/** Base64 back to bytes, or null where the text was not base64 at all. */
function fromBase64(encoded: string): Uint8Array<ArrayBuffer> | null {
  let binary: string;
  try {
    binary = atob(encoded);
  } catch {
    return null;
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
