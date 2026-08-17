import { useCallback, useRef, useState } from 'react';
import { loadPreferences, savePreferences } from './preferences';

// Synthesized rather than sampled: three cues don't justify shipping audio
// files, and an oscillator has no load time to get wrong.
const PLACE_TONE = { X: 523.25, O: 392 };
const WIN_ARPEGGIO = [523.25, 659.25, 783.99];
const DRAW_TONES = [392, 311.13];

const VIBRATE_PLACE = 12;
const VIBRATE_WIN = [0, 28, 36, 28];

function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Some browsers expose vibrate and then refuse to run it.
  }
}

/**
 * Sound and haptics behind a single switch, defaulted off and remembered across
 * visits.
 *
 * The AudioContext is built on the first cue rather than on mount, which means
 * it is always created inside a user gesture — browsers suspend contexts made
 * any earlier. Every path is guarded: feedback is decoration, and it must never
 * be able to break a move.
 */
export function useFeedback() {
  const [enabled, setEnabled] = useState(() => loadPreferences().sound);
  const contextRef = useRef(null);

  const getContext = useCallback(() => {
    if (contextRef.current) {
      return contextRef.current;
    }
    const Ctor = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctor) {
      return null;
    }
    try {
      contextRef.current = new Ctor();
      return contextRef.current;
    } catch {
      return null;
    }
  }, []);

  const tone = useCallback(
    (frequency, { delay = 0, duration = 0.14, peak = 0.07 } = {}) => {
      const context = getContext();
      if (!context) {
        return;
      }
      try {
        const startAt = context.currentTime + delay;
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;

        // A hard start or stop on a sine wave clicks audibly, so the envelope
        // ramps at both ends.
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

        oscillator.connect(gain).connect(context.destination);
        oscillator.start(startAt);
        oscillator.stop(startAt + duration + 0.02);
      } catch {
        // A refused or closed context must not reach the caller.
      }
    },
    [getContext],
  );

  const play = useCallback(
    (event, player) => {
      if (!enabled) {
        return;
      }
      if (event === 'place') {
        tone(PLACE_TONE[player] ?? PLACE_TONE.X, { duration: 0.09, peak: 0.05 });
        vibrate(VIBRATE_PLACE);
      } else if (event === 'win') {
        WIN_ARPEGGIO.forEach((frequency, step) => tone(frequency, { delay: step * 0.09 }));
        vibrate(VIBRATE_WIN);
      } else if (event === 'draw') {
        DRAW_TONES.forEach((frequency, step) =>
          tone(frequency, { delay: step * 0.11, peak: 0.05 }),
        );
      }
    },
    [enabled, tone],
  );

  const toggle = useCallback(() => {
    setEnabled((current) => {
      const next = !current;
      savePreferences({ sound: next });
      return next;
    });
  }, []);

  return { enabled, toggle, play };
}
