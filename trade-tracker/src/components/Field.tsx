import type { ChangeEventHandler } from 'react';

interface FieldProps {
  id: string;
  label: string;
  value: string;
  /** Numbers unless said otherwise — almost everything here is a price. */
  type?: 'number' | 'datetime-local';
  min?: number;
  max?: number;
  step?: number;
  onChange: ChangeEventHandler<HTMLInputElement>;
}

/**
 * One value the trader types, labelled. Number fields open the decimal
 * keyboard, because every figure this app asks for is a price or an amount and
 * the keyboard that opens is part of how fast the screen is to fill in.
 */
export default function Field({ id, label, value, type, min, max, step, onChange }: FieldProps) {
  const numeric = type === undefined || type === 'number';

  return (
    <p className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="field__input"
        type={type ?? 'number'}
        inputMode={numeric ? 'decimal' : undefined}
        step={numeric ? (step ?? 'any') : undefined}
        min={min}
        max={max}
        placeholder={numeric ? '0' : undefined}
        value={value}
        onChange={onChange}
      />
    </p>
  );
}
