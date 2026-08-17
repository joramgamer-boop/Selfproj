import 'fake-indexeddb/auto';
import { createMemoryEventStore } from './memoryEventStore';
import { createIndexedDbEventStore } from './indexedDbEventStore';
import { describeEventStoreContract, type EventStoreFactory } from './eventStoreContract';
import type { TradeTrackerEvent } from '../core/events';

describeEventStoreContract('in-memory', (): EventStoreFactory => {
  const log: TradeTrackerEvent[] = [];
  return { open: async () => createMemoryEventStore(log) };
});

let databases = 0;

describeEventStoreContract('IndexedDB', (): EventStoreFactory => {
  const databaseName = `trade-tracker-test-${(databases += 1)}`;
  return { open: async () => createIndexedDbEventStore(databaseName) };
});
