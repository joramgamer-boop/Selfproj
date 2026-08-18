import { createDurableStorage } from './durability';

describe('asking the browser to keep the Ledger', () => {
  it('reports durable storage when the request is granted', async () => {
    const storage = createDurableStorage({ persist: async () => true });

    expect(await storage.request()).toBe('durable');
  });

  it('reports the Ledger is evictable when the request is refused', async () => {
    const storage = createDurableStorage({ persist: async () => false });

    expect(await storage.request()).toBe('evictable');
  });

  it('reports unknown when the browser has no storage manager to ask', async () => {
    const storage = createDurableStorage(undefined);

    expect(await storage.request()).toBe('unknown');
  });

  it('reports unknown when the browser refuses to answer at all', async () => {
    const storage = createDurableStorage({
      persist: async () => {
        throw new Error('SecurityError');
      },
    });

    expect(await storage.request()).toBe('unknown');
  });
});
