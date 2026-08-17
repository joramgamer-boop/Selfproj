import type { TradeTrackerEvent } from '../core/events';

/**
 * The storage port. Deliberately narrow: the log is append-only, so there is
 * nothing to update and nothing to delete. Evidence blobs get their own methods
 * here when screenshots arrive.
 */
export interface EventStore {
  /** The whole log, oldest first. */
  read(): Promise<readonly TradeTrackerEvent[]>;
  /** Appends a batch as one unit — either all of it lands or none of it does. */
  append(events: readonly TradeTrackerEvent[]): Promise<void>;
}
