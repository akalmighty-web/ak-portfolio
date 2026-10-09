import { FRAMES, FRAMES_PORTRAIT, FRAMING, FRAMING_PORTRAIT, HOLDS, HOLDS_PORTRAIT } from '../config'
import { isPortrait } from './viewport'

// The two versions of the animation: 16:9 (desktop, tablets, phones held
// sideways) and 9:16 (phones held upright). Both use the same page freeze frames.
export const SETS = {
  landscape: { id: 'landscape', frames: FRAMES, holds: HOLDS, framing: FRAMING },
  portrait: { id: 'portrait', frames: FRAMES_PORTRAIT, holds: HOLDS_PORTRAIT, framing: FRAMING_PORTRAIT },
}

/** The set this screen should show. */
export const wantedSet = () => (isPortrait() ? SETS.portrait : SETS.landscape)
