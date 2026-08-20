import type {
  EvidenceAttached,
  EvidenceRemoved,
  PlanAbandoned,
  PlanCreated,
  PositionClosed,
  StopMoved,
  TradeTrackerEvent,
} from '../core/events';
import type { ExportFormat } from '../core/export';
import type { RuleId, Violation } from '../core/rules';

/** Shared across all three seams so a stored event looks the same everywhere. */
export function deposit(amount: number, at: string): TradeTrackerEvent {
  return { type: 'Deposit', at, amount };
}

/**
 * Money taken back out. The warnings default to none, so a test that is not
 * about them reads as an ordinary Withdrawal.
 */
export function withdrawal(amount: number, at: string, warnings: RuleId[] = []): TradeTrackerEvent {
  return { type: 'Withdrawal', at, amount, warnings };
}

/** The log review the tripwire asks for, once it has been done. */
export function drawdownReviewAcknowledged(at: string): TradeTrackerEvent {
  return { type: 'DrawdownReviewAcknowledged', at };
}

/**
 * A long with a 4% Stop at 2% Risk — the middle row of the source notes' table.
 * Override only the field a test is actually about.
 */
export function planCreated(
  fields: Partial<Omit<PlanCreated, 'type'>> & { at: string },
): TradeTrackerEvent {
  return {
    type: 'PlanCreated',
    id: 'plan-1',
    direction: 'long',
    entryPrice: 100,
    stopPrice: 96,
    leverage: 5,
    liquidationPrice: 80,
    riskFraction: 0.02,
    violations: [],
    ...fields,
  };
}

export function positionOpened(
  at: string,
  planId = 'plan-1',
  violations: Violation[] = [],
): TradeTrackerEvent {
  return { type: 'PositionOpened', at, planId, violations };
}

/**
 * The winner that runs a little past the exit: +$25 gross on the Plan above,
 * $1 of fees, and a Best Price the exit did not quite reach.
 */
export function positionClosed(
  fields: Partial<Omit<PositionClosed, 'type'>> & { at: string },
): TradeTrackerEvent {
  return {
    type: 'PositionClosed',
    planId: 'plan-1',
    // Absent a correction, what happened is what the clock said happened.
    openedAt: fields.at,
    closedAt: fields.at,
    entryPrice: 100,
    exitPrice: 110,
    bestPrice: 114,
    fees: 1,
    exitReason: 'take-profit hit',
    scaledIn: false,
    scaledOut: false,
    notes: '',
    ...fields,
  };
}

export function riskDefaultChanged(riskFraction: number, at: string): TradeTrackerEvent {
  return { type: 'RiskDefaultChanged', at, riskFraction };
}

/** A Plan skipped rather than taken. Defaults to the reason the log exists for. */
export function planAbandoned(
  fields: Partial<Omit<PlanAbandoned, 'type'>> & { at: string },
): TradeTrackerEvent {
  return { type: 'PlanAbandoned', planId: 'plan-1', reason: 'price ran away', ...fields };
}

/**
 * A Stop moved while the Position is live. Defaults to a tightening of the
 * standard long — 96 up to 98 — since that is the move no Rule argues with.
 */
export function stopMoved(
  fields: Partial<Omit<StopMoved, 'type'>> & { at: string },
): TradeTrackerEvent {
  return { type: 'StopMoved', planId: 'plan-1', stopPrice: 98, violations: [], ...fields };
}

/** A screenshot put on a Trade. The id names the blob the store holds. */
export function evidenceAttached(
  fields: Partial<Omit<EvidenceAttached, 'type'>> & { at: string },
): TradeTrackerEvent {
  return { type: 'EvidenceAttached', planId: 'plan-1', evidenceId: 'shot-1', ...fields };
}

/** A screenshot taken back off a Trade. */
export function evidenceRemoved(
  fields: Partial<Omit<EvidenceRemoved, 'type'>> & { at: string },
): TradeTrackerEvent {
  return { type: 'EvidenceRemoved', planId: 'plan-1', ...fields };
}

/**
 * A screenshot exactly as the phone's picker hands one over — a `File`, which
 * is the Blob the storage port stores. Four bytes rather than a real PNG:
 * nothing in this app opens it, so nothing needs it to decode.
 */
export function screenshot(bytes: number[] = [137, 80, 78, 71], name = 'fill.png'): File {
  return new File([new Uint8Array(bytes)], name, { type: 'image/png' });
}

/** The bytes of a stored screenshot, for comparing one blob against another. */
export async function bytesOf(image: Blob): Promise<Uint8Array> {
  return new Uint8Array(await image.arrayBuffer());
}

/** A copy of the log taken out of the app. Defaults to the one that is a Backup. */
export function exported(at: string, format: ExportFormat = 'json'): TradeTrackerEvent {
  return { type: 'Exported', at, format };
}

/** A Backup read back in, on the device it was installed on. */
export function restored(at: string): TradeTrackerEvent {
  return { type: 'Restored', at };
}
