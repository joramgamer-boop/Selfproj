import { useEffect, useState } from 'react';
import type { Durability, DurableStorage } from './storage/durability';

/** `undefined` until the browser has answered — the app claims nothing before then. */
export function useDurability(storage: DurableStorage): Durability | undefined {
  const [durability, setDurability] = useState<Durability>();

  useEffect(() => {
    let live = true;
    void storage
      .request()
      // A rejection here would leave the notice permanently absent, which is a
      // worse answer than "unknown": the trader would never learn the log can
      // be evicted.
      .catch((): Durability => 'unknown')
      .then((answer) => {
        if (live) setDurability(answer);
      });
    return () => {
      live = false;
    };
  }, [storage]);

  return durability;
}
