import { useState } from 'react';
import type { AbandonPlan } from '../core/commands';
import { ABANDON_REASONS, type AbandonReason } from '../core/plan';
import { formatAbandonReason } from '../format';
import type { RecordResult } from '../useTradeTracker';

interface AbandonReasonsProps {
  planId: string;
  onAbandon: (command: AbandonPlan) => Promise<RecordResult>;
}

/**
 * How a Plan gets skipped: one tap on the reason, and the skip is in the log
 * for good. The four sit on the row rather than behind a disclosure because
 * the tap that records the skip has to be the tap that gives the reason —
 * anything else is a reason typed after the decision, and this app exists to
 * catch the decision itself.
 *
 * Nothing is typed, either. A reason written as prose cannot be counted, and
 * counting them is the point: "price ran away" piling up is what turns entry
 * lag from a feeling into evidence.
 *
 * Alone among the things that write to the log this uses no Override, because
 * no Rule judges a skip — there is nothing to block and nothing to argue past.
 * What it does keep is the guard that matters everywhere: a second tap while
 * the first is still saving records nothing, since skipping one Plan twice is
 * not something that happened.
 */
export default function AbandonReasons({ planId, onAbandon }: AbandonReasonsProps) {
  const [saving, setSaving] = useState(false);
  const [rejection, setRejection] = useState<string | null>(null);

  const abandon = async (reason: AbandonReason) => {
    if (saving) return;
    setSaving(true);
    try {
      const result = await onAbandon({ type: 'AbandonPlan', planId, reason });
      // A recorded skip takes this Plan out of `planned` and the row stops
      // rendering these buttons, so there is nothing to clear. What is left to
      // say is a refusal — storage that would not take the skip, above all,
      // because then the log does not hold it and the screen must not pretend.
      setRejection(result.outcome === 'rejected' ? result.reason : null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="abandon">
      <p className="abandon__label">Not taking it?</p>
      <div className="abandon__reasons" role="group" aria-label="Why you are not taking it">
        {ABANDON_REASONS.map((reason) => (
          <button
            key={reason}
            className="abandon__reason"
            type="button"
            disabled={saving}
            onClick={() => void abandon(reason)}
          >
            {formatAbandonReason(reason)}
          </button>
        ))}
      </div>
      {rejection && (
        <p className="plan__rejection" role="alert">
          {rejection}
        </p>
      )}
    </div>
  );
}
