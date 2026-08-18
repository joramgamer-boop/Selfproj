import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Command, CommandContext } from './core/commands';
import { evaluate } from './core/commands';
import type { TradeTrackerEvent } from './core/events';
import type { RuleVerdict } from './core/rules';
import type { DerivedState } from './core/state';
import { deriveState } from './core/state';
import type { EventStore } from './storage/eventStore';

/**
 * What came of sending a command, in the core's own three outcomes. A block
 * is not an error: it is a set of Rule verdicts the trader may answer with an
 * Override, and the form renders them without deciding anything.
 */
export type RecordResult =
  | { readonly outcome: 'recorded' }
  | { readonly outcome: 'blocked'; readonly verdicts: readonly RuleVerdict[] }
  | { readonly outcome: 'rejected'; readonly reason: string };

export interface TradeTracker {
  readonly status: 'loading' | 'ready';
  readonly state: DerivedState;
  /** Evaluates the command in the core and, if it produced events, stores them. */
  record(command: Command): Promise<RecordResult>;
}

/**
 * The only place storage, the clock and the core meet. Components below this
 * point render derived state and dispatch commands — they decide nothing.
 */
export function useTradeTracker(store: EventStore, context: CommandContext): TradeTracker {
  const [log, setLog] = useState<readonly TradeTrackerEvent[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  // The log as it stands this instant. A command that starts while another is
  // still saving must fold the real log, not a render's stale copy of it —
  // otherwise the Balance on screen drifts from the Ledger that produced it.
  const stored = useRef<readonly TradeTrackerEvent[]>([]);

  const publish = useCallback((events: readonly TradeTrackerEvent[]) => {
    stored.current = events;
    setLog(events);
  }, []);

  useEffect(() => {
    let live = true;
    void store.read().then((events) => {
      if (!live) return;
      publish(events);
      setStatus('ready');
    });
    return () => {
      live = false;
    };
  }, [publish, store]);

  const state = useMemo(() => deriveState(log), [log]);

  const record = useCallback(
    async (command: Command): Promise<RecordResult> => {
      const evaluation = evaluate(deriveState(stored.current), command, context);
      if (evaluation.outcome !== 'append') return evaluation;

      try {
        await store.append(evaluation.events);
      } catch {
        // Nothing was appended, so nothing is derived from it either. Say so
        // rather than showing a Balance the Ledger does not actually hold.
        return { outcome: 'rejected', reason: 'Could not save that — nothing was recorded.' };
      }

      publish([...stored.current, ...evaluation.events]);
      return { outcome: 'recorded' };
    },
    [context, publish, store],
  );

  return { status, state, record };
}
