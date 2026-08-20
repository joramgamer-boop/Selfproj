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
  /**
   * The screenshot a Trade names, fetched only when one is actually looked at.
   * Everything else on the screen comes from folding the log; a screenshot is
   * hundreds of kilobytes and would make every open pay for a picture nobody
   * asked to see.
   */
  openEvidence(id: string): Promise<Blob | null>;
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

  /**
   * Drops a screenshot nothing points at any more. Failing to is a few hundred
   * kilobytes left behind where nothing can reach them — worth avoiding, and
   * not worth telling the trader about, since the thing they asked for is
   * recorded either way.
   */
  const forget = useCallback(
    async (id: string) => {
      try {
        await store.deleteEvidence(id);
      } catch {
        // Left where it is. An unreachable blob costs space; a refusal here
        // would cost the trader a Trade that was in fact recorded.
      }
    },
    [store],
  );

  const record = useCallback(
    async (command: Command): Promise<RecordResult> => {
      const evaluation = evaluate(deriveState(stored.current), command, context);
      if (evaluation.outcome !== 'append') return evaluation;

      // The image before the events that name it. The other order would leave
      // a Trade claiming proof of a fill that the store cannot produce — and
      // on a phone that is out of space, that is the likely order to fail in.
      const attaches = evaluation.attaches;
      if (attaches) {
        try {
          await store.putEvidence(attaches.id, attaches.image);
        } catch {
          return {
            outcome: 'rejected',
            reason: 'Could not save that screenshot — nothing was recorded.',
          };
        }
      }

      try {
        await store.append(evaluation.events);
      } catch {
        // Nothing was appended, so nothing is derived from it either. Say so
        // rather than showing a Balance the Ledger does not actually hold —
        // and take back the image, which now points at nothing.
        if (attaches) await forget(attaches.id);
        return { outcome: 'rejected', reason: 'Could not save that — nothing was recorded.' };
      }

      publish([...stored.current, ...evaluation.events]);

      // Only now. Until the event was down, the screenshot being replaced was
      // still the one the Trade stood on.
      if (evaluation.discards) await forget(evaluation.discards);
      return { outcome: 'recorded' };
    },
    [context, forget, publish, store],
  );

  const openEvidence = useCallback((id: string) => store.readEvidence(id), [store]);

  return { status, state, record, openEvidence };
}
