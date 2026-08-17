import type { TradeTrackerEvent } from '../core/events';
import type { EventStore } from './eventStore';

/**
 * The store tests run against, including the UI tests. Pass an existing log to
 * share it between handles — that is how a test stands in for reopening the app.
 */
export function createMemoryEventStore(log: TradeTrackerEvent[] = []): EventStore {
  return {
    read: async () => [...log],
    append: async (events) => {
      log.push(...events);
    },
  };
}
