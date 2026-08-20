import { useState } from 'react';
import type { Backups, BackupResult } from '../backups';
import FilePicker from './FilePicker';

interface BackupPanelProps {
  /** Folded from the log, like every other figure on the screen. */
  tradesSinceBackup: number;
  /** Whether new Plans are blocked for want of a Backup. The fold's answer,
   *  not this panel's — the Rule reads the same one. */
  backupDue: boolean;
  backups: Backups;
}

/**
 * Getting the log off this phone, and back onto one.
 *
 * It sits above the Trade log rather than under it, beside the rest of the
 * account, because the log grows without limit and a nag below it is a nag
 * nobody scrolls to. The count is always on screen for the same reason the
 * Drawdown is: a trader who watches it climb 6, 8, 9 has been given the chance
 * to act before the block arrives, and one who only meets it as a block has
 * already decided to trade.
 */
export default function BackupPanel({ tradesSinceBackup, backupDue, backups }: BackupPanelProps) {
  const [rejection, setRejection] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<BackupResult>) => {
    // The same guard every other panel here keeps: a second tap while the
    // first is still saving would write two Exported events for one file.
    if (busy) return;
    setBusy(true);
    try {
      const result = await action();
      setRejection(result.outcome === 'rejected' ? result.reason : null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`backup${backupDue ? ' backup--due' : ''}`} aria-labelledby="backup-heading">
      <h2 className="backup__heading" id="backup-heading">
        Backup
      </h2>
      {/* An alert only once it is one. A count that shouted from Trade one
          would be a nag nobody reads by the time it matters. */}
      <p
        className="backup__count"
        aria-label="Trades since the last Backup"
        role={backupDue ? 'alert' : undefined}
      >
        {countedAs(tradesSinceBackup)}
      </p>
      {backupDue && (
        <p className="backup__why">
          New Plans are blocked until you take one. Like every block, you can type a reason and
          go anyway.
        </p>
      )}
      <div className="backup__actions">
        <button
          type="button"
          className="backup__take"
          disabled={busy}
          onClick={() => void run(backups.backUp)}
        >
          Back up everything
        </button>
        <button
          type="button"
          className="backup__csv"
          disabled={busy}
          onClick={() => void run(backups.exportCsv)}
        >
          Export Trades as CSV
        </button>
      </div>
      {/* Said where the two buttons are, because the difference between them
          is the whole reason there are two: only one of them is a Backup. */}
      <p className="backup__note">
        The Backup holds the whole log and its screenshots, and is the only file this app can
        restore from. The CSV is for a spreadsheet.
      </p>
      {backups.restorable ? (
        <FilePicker
          id="restore-backup"
          accept="application/json,.json"
          label="Restore from a Backup"
          disabled={busy}
          onPick={(file) => void run(() => backups.restore(file))}
        />
      ) : (
        <p className="backup__note">
          Restoring is offered on a device with nothing recorded on it yet: the log is
          append-only, so a Backup is put back into a fresh install rather than over a log
          already here.
        </p>
      )}
      {rejection && (
        <p className="backup__rejection" role="alert">
          {rejection}
        </p>
      )}
    </section>
  );
}

/** The count as a sentence, since "0 Trades since your last Backup" is a riddle. */
function countedAs(tradesSinceBackup: number): string {
  if (tradesSinceBackup === 0) return 'Nothing has closed since your last Backup.';
  if (tradesSinceBackup === 1) return '1 Trade since your last Backup.';
  return `${tradesSinceBackup} Trades since your last Backup.`;
}
