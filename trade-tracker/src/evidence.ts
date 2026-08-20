import type { RecordResult } from './useTradeTracker';

/**
 * What a screen may do with Evidence: look at one, put one on a Trade, take
 * one off. Three functions rather than three props, because they are one
 * capability and they travel together down to the Trade detail.
 *
 * Conspicuously absent is anything that reads an image. A screen can show a
 * screenshot and store a screenshot; nothing anywhere can extract from one,
 * and there is deliberately no seam here through which that could be added
 * without saying so out loud (ADR-0003).
 */
export interface EvidenceActions {
  /** The stored screenshot, or null where the store has none under that id. */
  open(id: string): Promise<Blob | null>;
  /** Puts a screenshot on a Trade, over whatever was there. */
  attach(planId: string, image: Blob): Promise<RecordResult>;
  remove(planId: string): Promise<RecordResult>;
}
