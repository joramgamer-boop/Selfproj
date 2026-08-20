import { useEffect, useRef, useState } from 'react';
import type { EvidenceActions } from '../evidence';
import type { RecordResult } from '../useTradeTracker';
import { useEvidenceImage } from '../useEvidenceImage';
import ScreenshotPicker from './ScreenshotPicker';

interface EvidenceProps {
  /** The Trade this is proof of, by the Plan it was sized as. */
  planId: string;
  evidenceId: string | null;
  evidence: EvidenceActions;
}

/**
 * The screenshot of the closed-position screen, on the Trade it is proof of.
 *
 * It is shown and it is stored, and that is the whole of it: no figure
 * anywhere in this app was read out of it, and none can be (ADR-0003). The
 * screenshot does not hold the Stop as placed or the Best Price reached, which
 * are the two figures that define 1R and Capture Rate — so extraction would
 * faithfully capture the noise and silently drop everything that matters.
 */
export default function Evidence({ planId, evidenceId, evidence }: EvidenceProps) {
  const [full, setFull] = useState(false);
  const [rejection, setRejection] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const image = useEvidenceImage(evidenceId, evidence.open);

  const run = async (action: () => Promise<RecordResult>) => {
    // The same guard every form here keeps, for the same reason: a second tap
    // while the first is still saving would attach twice, and the second
    // attach would give up the screenshot the first had just stored.
    if (busy) return;
    setBusy(true);
    try {
      const result = await action();
      setRejection(result.outcome === 'rejected' ? result.reason : null);
    } finally {
      setBusy(false);
    }
  };

  const pick = (image: File) => void run(() => evidence.attach(planId, image));

  return (
    <div className="evidence">
      <p className="detail__label">Evidence</p>
      {evidenceId === null ? (
        <>
          <ScreenshotPicker
            id={`attach-${planId}`}
            label="Attach a screenshot"
            disabled={busy}
            onPick={pick}
          />
          {/* Said where the screenshot is asked for, because the question it
              answers — "why type the exit price when it is in the picture?" —
              is asked exactly here. */}
          <p className="evidence__note">Proof of the fill. Stored and shown, never read.</p>
        </>
      ) : (
        <>
          {/* Nothing at all while it loads. A Trade that says its screenshot
              is missing, then produces one a moment later, teaches the trader
              to distrust the one message that has to be believed. */}
          {image.status === 'missing' && (
            <p className="evidence__missing">The screenshot is not in this copy of the log.</p>
          )}
          {image.status === 'shown' && (
            <button
              type="button"
              className="evidence__thumb"
              onClick={() => setFull(true)}
              aria-label="View full size"
            >
              <img
                className="evidence__image"
                src={image.url}
                alt="Screenshot of the closed Position"
              />
            </button>
          )}
          <div className="evidence__actions">
            <ScreenshotPicker
              id={`replace-${planId}`}
              label="Replace the screenshot"
              disabled={busy}
              onPick={pick}
            />
            <button
              type="button"
              className="evidence__remove"
              disabled={busy}
              onClick={() => void run(() => evidence.remove(planId))}
            >
              Remove the screenshot
            </button>
          </div>
        </>
      )}
      {rejection && (
        <p className="evidence__rejection" role="alert">
          {rejection}
        </p>
      )}
      {full && image.status === 'shown' && (
        <Viewer url={image.url} onClose={() => setFull(false)} />
      )}
    </div>
  );
}

/**
 * The screenshot at its own size, over everything else.
 *
 * Full size rather than fitted, because the point of the picture is reading
 * the figures on it — and an exchange screen is taller than a phone, so it
 * scrolls rather than shrinking to fit and proving nothing.
 */
function Viewer({ url, onClose }: { url: string; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // The way out has the focus as soon as the picture is up: the viewer
    // covers the log, and tabbing to find the exit is not a phone gesture.
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="viewer" role="dialog" aria-label="Screenshot" aria-modal="true">
      <button ref={close} type="button" className="viewer__close" onClick={onClose}>
        Close
      </button>
      <div className="viewer__frame">
        <img className="viewer__image" src={url} alt="Screenshot of the closed Position" />
      </div>
    </div>
  );
}
