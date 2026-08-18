import type { Durability } from '../storage/durability';

const notices: Record<Durability, { verdict: string; detail: string }> = {
  durable: {
    verdict: 'Durable',
    detail: 'The browser has promised to keep this log until you delete it.',
  },
  evictable: {
    verdict: 'At risk',
    detail:
      'The browser may clear this log after a few weeks unused. Add Trade Tracker to your home screen to make storage durable.',
  },
  unknown: {
    verdict: 'Unknown',
    detail:
      'This browser will not say whether the log can be cleared. Add Trade Tracker to your home screen to be safe.',
  },
};

/** What the browser answered when asked to keep the Ledger. */
export default function StorageNotice({ durability }: { durability: Durability }) {
  const { verdict, detail } = notices[durability];

  return (
    <section className={`storage storage--${durability}`} aria-label="Storage durability">
      <p className="storage__verdict">Storage: {verdict}</p>
      <p className="storage__detail">{detail}</p>
    </section>
  );
}
