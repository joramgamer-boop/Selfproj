import { useEffect, useState } from 'react';

/**
 * A stored screenshot on its way to the screen. Three answers rather than a
 * URL or null, because "not fetched yet" and "the store has not got it" want
 * different things on screen: collapsed into one, every Trade with Evidence
 * announces the screenshot is missing for as long as it takes to load it.
 */
export type EvidenceImage =
  | { readonly status: 'loading' }
  | { readonly status: 'missing' }
  | { readonly status: 'shown'; readonly url: string };

/**
 * The stored screenshot as something an `<img>` can point at.
 *
 * The URL is revoked when the id changes or the Trade detail closes. An object
 * URL holds the whole image in memory until it is let go, and a log reviewed
 * by opening one Trade after another would otherwise accumulate every
 * screenshot it had ever shown.
 */
export function useEvidenceImage(
  evidenceId: string | null,
  open: (id: string) => Promise<Blob | null>,
): EvidenceImage {
  // The id is kept beside the answer so a screenshot can never be shown
  // against the wrong Trade: what was loaded and what is being asked for are
  // compared below rather than assumed to have stayed in step. A null url is
  // the store answering that it has no such image.
  const [loaded, setLoaded] = useState<{ id: string; url: string | null } | null>(null);

  useEffect(() => {
    if (evidenceId === null) return;

    let live = true;
    let created: string | null = null;
    void open(evidenceId).then((image) => {
      if (!live) return;
      created = image === null ? null : URL.createObjectURL(image);
      setLoaded({ id: evidenceId, url: created });
    });

    return () => {
      live = false;
      if (created !== null) URL.revokeObjectURL(created);
      setLoaded(null);
    };
  }, [evidenceId, open]);

  if (evidenceId === null) return { status: 'missing' };
  if (loaded === null || loaded.id !== evidenceId) return { status: 'loading' };
  return loaded.url === null ? { status: 'missing' } : { status: 'shown', url: loaded.url };
}
