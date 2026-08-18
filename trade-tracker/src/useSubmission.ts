import { useState, type FormEvent } from 'react';
import type { Override } from './core/commands';
import type { RuleVerdict } from './core/rules';
import type { RecordResult } from './useTradeTracker';

export interface Submission {
  readonly saving: boolean;
  /** What the core said when it refused. Null while there is nothing to say. */
  readonly rejection: string | null;
  /** The Rules standing in the way, or null while none is. */
  readonly block: readonly RuleVerdict[] | null;
  /** What the trader has typed to proceed anyway. */
  readonly reason: string;
  readonly setReason: (reason: string) => void;
  /** Clears a refusal or a block once the trader edits what caused it. */
  readonly clearOutcome: () => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

/**
 * The shape every form in this app shares: send the command, and either clear
 * the form, show what the core refused, or show the Rules it blocked on. It
 * decides nothing — the reason it renders is the core's, not its own, and the
 * Override it sends is the trader's.
 *
 * Once blocked, the same submit sends again with the typed reason attached, so
 * a form is never in two states at once and there is only ever one button to
 * press. The reason is passed through untouched: whether it says enough is
 * also the core's call.
 *
 * The saving guard is load-bearing rather than cosmetic. A second tap while
 * the first is still saving would record twice, and every figure the app shows
 * is folded from those records.
 */
export function useSubmission(
  send: (override: Override | null) => Promise<RecordResult>,
  onRecorded: () => void,
): Submission {
  const [saving, setSaving] = useState(false);
  const [rejection, setRejection] = useState<string | null>(null);
  const [block, setBlock] = useState<readonly RuleVerdict[] | null>(null);
  const [reason, setReason] = useState('');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      const result = await send(block === null ? null : { reason });
      setRejection(result.outcome === 'rejected' ? result.reason : null);

      // A block that was refused stays up: the Rule still stands, and the
      // refusal beneath it says what else is in the way.
      if (result.outcome === 'blocked') setBlock(result.verdicts);
      if (result.outcome === 'recorded') {
        setBlock(null);
        setReason('');
        onRecorded();
      }
    } finally {
      setSaving(false);
    }
  };

  return {
    saving,
    rejection,
    block,
    reason,
    setReason,
    // A block is a verdict on the figures that were sent. Change one and the
    // verdict is stale, so it goes rather than sitting there contradicting
    // what is now on screen.
    clearOutcome: () => {
      setRejection(null);
      setBlock(null);
      setReason('');
    },
    onSubmit,
  };
}
