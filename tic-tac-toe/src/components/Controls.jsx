function SoundIcon({ enabled }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="sound-toggle__icon">
      <path
        d="M4 9v6h4l5 4V5L8 9H4z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {enabled ? (
        <path
          d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M17 9.5l4 5m0-5l-4 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export default function Controls({ onResetScores, onChangeMode, soundEnabled, onToggleSound }) {
  return (
    <div className="controls">
      <button
        type="button"
        className={`button sound-toggle${soundEnabled ? ' button--active' : ''}`}
        onClick={onToggleSound}
        aria-pressed={soundEnabled}
        // Spelled out rather than relying on aria-pressed alone, so the action
        // is unambiguous however the button is announced.
        aria-label={soundEnabled ? 'Turn sound off' : 'Turn sound on'}
      >
        <SoundIcon enabled={soundEnabled} />
      </button>
      <button type="button" className="button button--primary" onClick={onResetScores}>
        Reset scores
      </button>
      <button type="button" className="button button--secondary" onClick={onChangeMode}>
        Change Mode
      </button>
    </div>
  );
}
