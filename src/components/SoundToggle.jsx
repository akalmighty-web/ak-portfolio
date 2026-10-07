import { setSound, useSoundOn } from '../fx/sound'

/** Small speaker button: 8-bit UI sounds on / off (off by default). */
export default function SoundToggle({ className = '' }) {
  const on = useSoundOn()
  return (
    <button
      type="button"
      className={`sound-toggle ${className}`}
      aria-pressed={on}
      aria-label={on ? 'Turn sounds off' : 'Turn sounds on'}
      title={on ? 'Sound: on' : 'Sound: off'}
      onClick={() => setSound(!on)}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
        {on ? (
          <>
            <path className="sound-wave" d="M15.5 9.2a4 4 0 0 1 0 5.6" />
            <path className="sound-wave sound-wave--2" d="M18 6.8a7.5 7.5 0 0 1 0 10.4" />
          </>
        ) : (
          <path d="M16 9.5l5 5M21 9.5l-5 5" />
        )}
      </svg>
    </button>
  )
}
