/**
 * How safe the log is from the browser deleting it.
 *
 * iOS evicts storage from ordinary Safari tabs after roughly a week of non-use.
 * A trader with gaps between Trades would lose the whole log that way, so the
 * app asks for durable storage and says out loud what it got.
 */
export type Durability = 'durable' | 'evictable' | 'unknown';

export interface DurableStorage {
  /** Asks the browser to keep this origin's data, and reports where that left us. */
  request(): Promise<Durability>;
}

export function createDurableStorage(
  /** The slice of the browser's StorageManager this needs. */
  storage: Pick<StorageManager, 'persist'> | undefined,
): DurableStorage {
  return {
    request: async () => {
      if (!storage?.persist) return 'unknown';

      try {
        return (await storage.persist()) ? 'durable' : 'evictable';
      } catch {
        // Private browsing modes refuse to answer rather than answering no.
        // "Unknown" and "evictable" call for different words on screen.
        return 'unknown';
      }
    },
  };
}

export const browserDurableStorage: DurableStorage = createDurableStorage(
  typeof navigator === 'undefined' ? undefined : navigator.storage,
);
