import type { TradeTrackerEvent } from '../core/events';

/**
 * The storage port. Deliberately narrow: the log is append-only, so there is
 * nothing to update and nothing to delete.
 *
 * Evidence sits here beside the log rather than behind a port of its own,
 * because the two are written together and their order matters — the image
 * goes down first, and a replaced one is given up only once the event that
 * replaced it is safe. The screenshots are also the reason this is IndexedDB:
 * they are hundreds of kilobytes each, and the log is read whole on every
 * open, so an image is fetched by id only when a Trade is actually opened.
 */
export interface EventStore {
  /** The whole log, oldest first. */
  read(): Promise<readonly TradeTrackerEvent[]>;
  /** Appends a batch as one unit — either all of it lands or none of it does. */
  append(events: readonly TradeTrackerEvent[]): Promise<void>;
  /** Stores a screenshot under the id an `EvidenceAttached` names it by. */
  putEvidence(id: string, image: Blob): Promise<void>;
  /** The screenshot stored under that id, or null where there is none. */
  readEvidence(id: string): Promise<Blob | null>;
  /** Drops a screenshot nothing points at. Storing nothing is not an error. */
  deleteEvidence(id: string): Promise<void>;
}
