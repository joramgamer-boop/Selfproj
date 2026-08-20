import type { TradeTrackerEvent } from '../core/events';
import type { EventStore } from './eventStore';

/**
 * The store tests run against, including the UI tests. Pass an existing log —
 * and the screenshots that go with it — to share them between handles: that is
 * how a test stands in for reopening the app.
 */
export function createMemoryEventStore(
  log: TradeTrackerEvent[] = [],
  evidence: Map<string, Blob> = new Map(),
): EventStore {
  return {
    read: async () => [...log],
    append: async (events) => {
      log.push(...events);
    },
    putEvidence: async (id, image) => {
      evidence.set(id, image);
    },
    readEvidence: async (id) => evidence.get(id) ?? null,
    deleteEvidence: async (id) => {
      evidence.delete(id);
    },
  };
}
