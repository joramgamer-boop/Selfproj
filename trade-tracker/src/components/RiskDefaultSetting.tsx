import { useState, type FormEvent } from 'react';
import {
  MAX_RISK_FRACTION,
  MIN_RISK_FRACTION,
  riskFractionOf,
  riskPercentOf,
} from '../core/risk';
import type { RecordResult } from '../useTradeTracker';

interface RiskDefaultSettingProps {
  riskDefault: number;
  onSave: (riskFraction: number) => Promise<RecordResult>;
}

/**
 * The Risk a Plan starts at. Changing it is an event, not a preference blob,
 * so the log can later say what the default was on any given day.
 */
export default function RiskDefaultSetting({ riskDefault, onSave }: RiskDefaultSettingProps) {
  // Null until edited, so the field shows what the log actually holds rather
  // than a copy taken when this form first rendered.
  const [typed, setTyped] = useState<string | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const percent = typed ?? String(riskPercentOf(riskDefault));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      const result = await onSave(riskFractionOf(Number(percent)));
      if (result.ok) {
        setTyped(null);
        setRejection(null);
      } else {
        setRejection(result.reason);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="setting" onSubmit={submit} noValidate>
      <label className="setting__label" htmlFor="default-risk">
        Default Risk, % of Balance
      </label>
      <div className="setting__row">
        <input
          id="default-risk"
          className="setting__input"
          type="number"
          inputMode="decimal"
          min={riskPercentOf(MIN_RISK_FRACTION)}
          max={riskPercentOf(MAX_RISK_FRACTION)}
          step={0.1}
          value={percent}
          onChange={(event) => setTyped(event.target.value)}
        />
        <button className="setting__submit" type="submit" disabled={saving}>
          Save default
        </button>
      </div>
      {rejection && (
        <p className="setting__rejection" role="alert">
          {rejection}
        </p>
      )}
    </form>
  );
}
