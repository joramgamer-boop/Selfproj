/**
 * Time enters the core only through a Clock, so every timestamp a command
 * stamps is deterministic in tests and editable as data later.
 */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

/** Test helper: a Clock frozen at one instant. */
export function fixedClock(instant: string): Clock {
  return { now: () => new Date(instant) };
}

/**
 * Whether a corrected timestamp names a real instant. Timestamps are editable,
 * so one can arrive as whatever the field held.
 */
export function isInstant(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}
