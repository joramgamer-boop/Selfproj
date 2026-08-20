import { useState, type ChangeEvent, type ChangeEventHandler } from 'react';
import type { Clock } from '../core/clock';
import type { ClosePosition } from '../core/commands';
import type { Position } from '../core/state';
import { EXIT_REASONS } from '../core/trade';
import { formatExitReason, fromDateTimeInput, toDateTimeInput } from '../format';
import type { RecordResult } from '../useTradeTracker';
import { useSubmission } from '../useSubmission';
import Field from './Field';
import FilePicker from './FilePicker';

interface ClosePositionFormProps {
  position: Position;
  clock: Clock;
  onClose: (command: ClosePosition) => Promise<RecordResult>;
}

const blank = { exitPrice: '', fees: '', bestPrice: '', exitReason: '', notes: '' };

/**
 * What is left to type once the Position closes: exit price, fees, Best Price
 * and a reason. Sizing already happened, so this is the whole record.
 *
 * The unusual half — an average entry, a scaled fill, a hold that ran to
 * different times than the stamps say — sits behind a disclosure. Every one of
 * those defaults to what the log already knows, so the common close is four
 * fields and a button.
 */
export default function ClosePositionForm({ position, clock, onClose }: ClosePositionFormProps) {
  const [fields, setFields] = useState(blank);
  const [scaledIn, setScaledIn] = useState(false);
  const [scaledOut, setScaledOut] = useState(false);
  // Null until the trader types over the default, so a field left alone stays
  // the log's own figure rather than a copy taken when this form rendered.
  const [typedEntry, setTypedEntry] = useState<string | null>(null);
  const [typedOpenedAt, setTypedOpenedAt] = useState<string | null>(null);
  const [typedClosedAt, setTypedClosedAt] = useState<string | null>(null);
  // Optional, and held here until the close is submitted, so the image and the
  // Trade it is proof of are recorded as one thing.
  const [evidence, setEvidence] = useState<File | null>(null);
  // Stamped when the corrections are opened rather than when the form mounted,
  // which may have been hours ago — the point of the field is a true hold.
  const [correctingSince, setCorrectingSince] = useState<Date | null>(null);

  const { saving, rejection, clearOutcome, onSubmit } = useSubmission(
    () =>
      onClose({
        type: 'ClosePosition',
        planId: position.plan.id,
        entryPrice: Number(typedEntry ?? position.plan.entryPrice),
        exitPrice: Number(fields.exitPrice),
        bestPrice: Number(fields.bestPrice),
        // Blank fees are missing, not zero: the exchange always charged
        // something, and a silent zero would flatter the fee drag this log
        // exists to measure.
        fees: fields.fees.trim() === '' ? Number.NaN : Number(fields.fees),
        exitReason: fields.exitReason,
        scaledIn,
        scaledOut,
        notes: fields.notes,
        evidence,
        openedAt: typedOpenedAt === null ? null : fromDateTimeInput(typedOpenedAt),
        closedAt: typedClosedAt === null ? null : fromDateTimeInput(typedClosedAt),
      }),
    () => {
      setFields(blank);
      setScaledIn(false);
      setScaledOut(false);
      setTypedEntry(null);
      setTypedOpenedAt(null);
      setTypedClosedAt(null);
      setCorrectingSince(null);
      setEvidence(null);
    },
  );

  type Typed = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  const set = (field: keyof typeof blank) => {
    return (event: ChangeEvent<Typed>) => {
      setFields((current) => ({ ...current, [field]: event.target.value }));
      clearOutcome();
    };
  };

  return (
    <form className="close" onSubmit={onSubmit} noValidate>
      <h3 className="close__heading">Close it</h3>

      <div className="close__fields">
        <Field
          id="exit-price"
          label="Exit price"
          value={fields.exitPrice}
          onChange={set('exitPrice')}
        />
        <Field id="fees" label="Fees" value={fields.fees} onChange={set('fees')} />
        <Field
          id="best-price"
          label="Best Price"
          value={fields.bestPrice}
          onChange={set('bestPrice')}
        />
        <p className="field">
          <label className="field__label" htmlFor="exit-reason">
            Exit Reason
          </label>
          <select
            id="exit-reason"
            className="field__input"
            value={fields.exitReason}
            onChange={set('exitReason')}
          >
            <option value="">Choose…</option>
            {EXIT_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {formatExitReason(reason)}
              </option>
            ))}
          </select>
        </p>
      </div>

      {/* Best Price is asked for on losers as well as winners: a loser that ran
          a long way in your favour first is a round-trip, and that is the most
          expensive leak in the log. */}
      <p className="close__note">Best Price is the furthest it ran your way, win or lose.</p>

      <p className="field">
        <label className="field__label" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          className="field__input close__notes"
          rows={2}
          value={fields.notes}
          onChange={set('notes')}
        />
      </p>

      <button
        className="close__correct"
        type="button"
        aria-expanded={correctingSince !== null}
        onClick={() =>
          setCorrectingSince((current) => (current === null ? clock.now() : null))
        }
      >
        Correct the record
      </button>

      {correctingSince !== null && (
        <div className="close__corrections">
          <Field
            id="average-entry"
            label="Entry price, averaged"
            value={typedEntry ?? String(position.plan.entryPrice)}
            onChange={(event) => {
              setTypedEntry(event.target.value);
              clearOutcome();
            }}
          />
          <Toggle
            id="scaled-in"
            label="Scaled in"
            checked={scaledIn}
            onChange={() => setScaledIn((current) => !current)}
          />
          <Field
            type="datetime-local"
            id="opened-at"
            label="Opened at"
            value={typedOpenedAt ?? toDateTimeInput(position.openedAt)}
            onChange={(event) => {
              setTypedOpenedAt(event.target.value);
              clearOutcome();
            }}
          />
          <Field
            type="datetime-local"
            id="closed-at"
            label="Closed at"
            value={typedClosedAt ?? toDateTimeInput(correctingSince)}
            onChange={(event) => {
              setTypedClosedAt(event.target.value);
              clearOutcome();
            }}
          />
        </div>
      )}

      {/* Scaled out sits with the exit price it qualifies: this Trade has one
          exit price either way, and the flag is what says it was an average. */}
      <Toggle
        id="scaled-out"
        label="Scaled out"
        checked={scaledOut}
        onChange={() => setScaledOut((current) => !current)}
      />

      {/* Optional, and said so: a screenshot is proof of the fill and never a
          source of one, so a Position is never held open for want of a
          picture (ADR-0003). */}
      <FilePicker
        id="close-evidence"
        accept="image/*"
        label="Screenshot (optional)"
        onPick={(image) => {
          setEvidence(image);
          clearOutcome();
        }}
      />
      {evidence && (
        <p className="close__note">
          {evidence.name} will be attached to the Trade.{' '}
          {/* Load-bearing rather than tidy. A screenshot the core will not
              store would otherwise ride along on every submit from here, and
              a Position that cannot be closed for want of the right picture
              is the app refusing to record a trade that already happened. */}
          <button
            type="button"
            className="close__unpick"
            onClick={() => {
              setEvidence(null);
              clearOutcome();
            }}
          >
            Clear the screenshot
          </button>
        </p>
      )}

      <button className="close__submit" type="submit" disabled={saving}>
        Close Position
      </button>

      {rejection && (
        <p className="close__rejection" role="alert">
          {rejection}
        </p>
      )}
    </form>
  );
}

interface ToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
}

function Toggle({ id, label, checked, onChange }: ToggleProps) {
  return (
    <p className="toggle">
      <input id={id} className="toggle__box" type="checkbox" checked={checked} onChange={onChange} />
      <label className="toggle__label" htmlFor={id}>
        {label}
      </label>
    </p>
  );
}
