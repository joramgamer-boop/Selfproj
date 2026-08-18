import { useState, type ChangeEventHandler, type FormEvent } from 'react';
import type { CreatePlan } from '../core/commands';
import type { Direction } from '../core/plan';
import {
  MAX_RISK_FRACTION,
  MIN_RISK_FRACTION,
  riskFractionOf,
  riskPercentOf,
} from '../core/risk';
import { sizeNewPlan } from '../core/sizing';
import { formatMoney } from '../format';
import type { RecordResult } from '../useTradeTracker';

interface PlanSizerProps {
  balance: number;
  /** Seeds the Risk field. A Plan may then use anything in the 2–3% band. */
  riskDefault: number;
  onCreate: (command: CreatePlan) => Promise<RecordResult>;
}

const blank = { entryPrice: '', stopPrice: '', leverage: '', liquidationPrice: '' };
type Fields = typeof blank;

/**
 * The screen the whole app exists for. It reads Balance from derived state,
 * hands the typed figures to the core's sizing, and renders what came back —
 * the arithmetic is not this component's, so the size previewed here is
 * exactly the size the command will record.
 */
export default function PlanSizer({ balance, riskDefault, onCreate }: PlanSizerProps) {
  const [direction, setDirection] = useState<Direction>('long');
  const [fields, setFields] = useState<Fields>(blank);
  // Null until the trader overrides it, so the field follows the setting —
  // including a change made after this form was first rendered.
  const [typedRisk, setTypedRisk] = useState<string | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const riskPercent = typedRisk ?? String(riskPercentOf(riskDefault));
  const inputs = {
    direction,
    entryPrice: Number(fields.entryPrice),
    stopPrice: Number(fields.stopPrice),
    leverage: Number(fields.leverage),
    liquidationPrice: Number(fields.liquidationPrice),
    riskFraction: riskFractionOf(Number(riskPercent)),
  };
  // Whether the trader has finished typing — not whether what they typed is
  // any good, which is the core's to say. A blank field is not a wrong one,
  // so there is nothing to size yet and nothing to complain about.
  const everyFieldTyped = Object.values(fields).every((value) => value.trim() !== '');
  const sizing = everyFieldTyped ? sizeNewPlan(balance, inputs) : null;
  const sized = sizing?.outcome === 'sized' ? sizing : null;
  const problem = rejection ?? (sizing?.outcome === 'unsizable' ? sizing.reason : null);

  const set = (field: keyof Fields): ChangeEventHandler<HTMLInputElement> => {
    return (event) => {
      const { value } = event.target;
      setFields((current) => ({ ...current, [field]: value }));
      setRejection(null);
    };
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      const result = await onCreate({ type: 'CreatePlan', ...inputs });
      if (result.ok) {
        setFields(blank);
        setTypedRisk(null);
        setRejection(null);
      } else {
        setRejection(result.reason);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="sizer" onSubmit={submit} noValidate>
      <h2 className="sizer__heading">Plan</h2>

      <fieldset className="sizer__direction">
        <legend className="sizer__legend">Direction</legend>
        {(['long', 'short'] as const).map((option) => (
          <button
            key={option}
            type="button"
            className="sizer__toggle"
            aria-pressed={direction === option}
            onClick={() => {
              setDirection(option);
              setRejection(null);
            }}
          >
            {option === 'long' ? 'Long' : 'Short'}
          </button>
        ))}
      </fieldset>

      <div className="sizer__fields">
        <Field
          id="entry-price"
          label="Entry price"
          value={fields.entryPrice}
          onChange={set('entryPrice')}
        />
        <Field id="stop-price" label="Stop" value={fields.stopPrice} onChange={set('stopPrice')} />
        <Field id="leverage" label="Leverage" value={fields.leverage} onChange={set('leverage')} />
        <Field
          id="liquidation-price"
          label="Liquidation price"
          value={fields.liquidationPrice}
          onChange={set('liquidationPrice')}
        />
        <Field
          id="risk-percent"
          label="Risk, % of Balance"
          value={riskPercent}
          min={riskPercentOf(MIN_RISK_FRACTION)}
          max={riskPercentOf(MAX_RISK_FRACTION)}
          step={0.1}
          onChange={(event) => {
            setTypedRisk(event.target.value);
            setRejection(null);
          }}
        />
      </div>

      {/* Dollar Risk is the figure this screen exists to show, so it is the
          largest thing on it. Notional and Margin below are what gets typed
          into the exchange — useful, secondary, never mistaken for the risk. */}
      <section className="sizing" aria-label="Sizing">
        <p className="sizing__label">Risk</p>
        <p className="sizing__risk" aria-label="Risk">
          {sized ? formatMoney(sized.risk) : '—'}
        </p>
        <dl className="sizing__derived">
          <div className="sizing__figure">
            <dt>Notional</dt>
            <dd aria-label="Notional">{sized ? formatMoney(sized.notional) : '—'}</dd>
          </div>
          <div className="sizing__figure">
            <dt>Margin to post</dt>
            <dd aria-label="Margin">{sized ? formatMoney(sized.margin) : '—'}</dd>
          </div>
        </dl>
        <p className="sizing__assumption">Isolated margin assumed.</p>
      </section>

      <button className="sizer__submit" type="submit" disabled={saving}>
        Create Plan
      </button>

      {problem && (
        <p className="sizer__rejection" role="alert">
          {problem}
        </p>
      )}
    </form>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: ChangeEventHandler<HTMLInputElement>;
}

function Field({ id, label, value, min, max, step, onChange }: FieldProps) {
  return (
    <p className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="field__input"
        type="number"
        inputMode="decimal"
        step={step ?? 'any'}
        min={min}
        max={max}
        placeholder="0"
        value={value}
        onChange={onChange}
      />
    </p>
  );
}
