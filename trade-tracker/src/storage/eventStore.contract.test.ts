import 'fake-indexeddb/auto';
import { createMemoryEventStore } from './memoryEventStore';
import { createIndexedDbEventStore } from './indexedDbEventStore';
import { describeEventStoreContract, type EventStoreFactory } from './eventStoreContract';
import type { TradeTrackerEvent } from '../core/events';

describeEventStoreContract('in-memory', (): EventStoreFactory => {
  // One body of data, handed to every handle the factory opens: the log and
  // the screenshots alike, since reopening the app must find both.
  const log: TradeTrackerEvent[] = [];
  const evidence = new Map<string, Blob>();
  return { open: async () => createMemoryEventStore(log, evidence) };
});

let databases = 0;

describeEventStoreContract('IndexedDB', (): EventStoreFactory => {
  const databaseName = `trade-tracker-test-${(databases += 1)}`;
  return { open: async () => createIndexedDbEventStore(databaseName) };
});
