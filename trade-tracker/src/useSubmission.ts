import { useState, type FormEvent } from 'react';
import type { RecordResult } from './useTradeTracker';

export interface Submission {
  readonly saving: boolean;
  /** What the core said when it refused. Null while there is nothing to say. */
  readonly rejection: string | null;
  /** Clears the refusal once the trader starts correcting what caused it. */
  readonly clearRejection: () => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

/**
 * The shape every form in this app shares: send the command, and either clear
 * the form or show what the core refused. It decides nothing — the reason it
 * renders is the core's, not its own.
 *
 * The saving guard is load-bearing rather than cosmetic. A second tap while
 * the first is still saving would record twice, and every figure the app shows
 * is folded from those records.
 */
export function useSubmission(
  send: () => Promise<RecordResult>,
  onRecorded: () => void,
): Submission {
  const [saving, setSaving] = useState(false);
  const [rejection, setRejection] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      const result = await send();
      if (result.ok) {
        setRejection(null);
        onRecorded();
      } else {
        setRejection(result.reason);
      }
    } finally {
      setSaving(false);
    }
  };

  return { saving, rejection, clearRejection: () => setRejection(null), onSubmit };
}
