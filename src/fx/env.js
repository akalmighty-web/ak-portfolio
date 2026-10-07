// Shared checks for the interactive layer.

const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')

/** A real mouse / trackpad (cursor effects); touch devices get taps instead. */
export const finePointer = () => fine.matches

/** The visitor asked for less motion: decorative motion is skipped. */
export const reducedMotion = () => reduce.matches
