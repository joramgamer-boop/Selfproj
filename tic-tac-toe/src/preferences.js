const STORAGE_KEY = 'tic-tac-toe:preferences';

// Deliberately absent: the score. A session's score is meaningless once you've
// walked away from it — coming back days later to a stale 7-3 is worse than
// starting fresh.
const DEFAULTS = {
  // Off until asked for. A page that makes noise on first visit is a page you
  // close.
  sound: false,
  mode: '2p',
  difficulty: 'medium',
};

// Storage is unavailable in more cases than it looks (private browsing, disabled
// cookies, quota). None of them are worth breaking the game over, so every path
// here falls back to defaults rather than throwing.
export function loadPreferences() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULTS };
    }
    const parsed = JSON.parse(stored);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePreferences(patch) {
  try {
    const next = { ...loadPreferences(), ...patch };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Preferences are a convenience; losing them is not worth a broken game.
  }
}
