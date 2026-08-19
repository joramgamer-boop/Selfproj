import { useState } from 'react';
import type { MoveStop } from '../core/commands';
import type { Position } from '../core/state';
import type { RecordResult } from '../useTradeTracker';
import { useSubmission } from '../useSubmission';
import Field from './Field';
import Override from './Override';

interface MoveStopFormProps {
  position: Position;
  onMove: (command: MoveStop) => Promise<RecordResult>;
}

/**
 * The one thing a live Position can still be told: where the Stop stands from
 * here. One field and one button, because tightening a Stop happens while the
 * price is moving and anything slower gets done on the exchange and never
 * logged.
 *
 * It asks for the price and nothing else. Whether the move tightens or widens,
 * and what a widening costs, are the core's to decide — and what it does to 1R
 * is nothing at all, which is why there is no figure here to preview.
 */
export default function MoveStopForm({ position, onMove }: MoveStopFormProps) {
  const [stopPrice, setStopPrice] = useState('');

  const { saving, rejection, block, reason, setReason, clearOutcome, onSubmit } = useSubmission(
    (override) =>
      onMove({
        type: 'MoveStop',
        planId: position.plan.id,
        stopPrice: Number(stopPrice),
        override,
      }),
    () => setStopPrice(''),
  );

  return (
    <form className="move-stop" onSubmit={onSubmit} noValidate>
      <Field
        id="moved-stop"
        label="Move the Stop to"
        value={stopPrice}
        onChange={(event) => {
          setStopPrice(event.target.value);
          clearOutcome();
        }}
      />
      <Override
        block={block}
        label="Move the Stop"
        className="move-stop__submit"
        saving={saving}
        id={`move-stop-override-${position.plan.id}`}
        reason={reason}
        onReason={setReason}
      />
      {rejection && (
        <p className="move-stop__rejection" role="alert">
          {rejection}
        </p>
      )}
    </form>
  );
}
