import { FRAMES, FRAMING, INTRO_SETTLE } from '../config'
import { isScaled } from './viewport'

/** Pick the frame set matching the screen (frames are cover-fit). */
export function pickSize() {
  if (isScaled()) return FRAMES.sizes[1] // phones / tablets: the scaled 1920×1080 stage gets the 1920 set
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const need = Math.max(window.innerWidth, (window.innerHeight * 16) / 9) * dpr
  return FRAMES.sizes.find((s) => s >= need * 0.9) ?? FRAMES.sizes.at(-1)
}

const smooth = (t) => t * t * (3 - 2 * t)
const lerp = (a, b, t) => a + (b - a) * t

// The intro is plain cover-fit; it eases into Home's framing over INTRO_SETTLE,
// while the opaque frames are plain white.
const INTRO = { intro: true, zoom: 1, offsetX: 0, offsetY: 0 }

/** The two framing keys around a (fractional) frame, and how far between them. */
function keysAt(frame) {
  const first = FRAMING[0]
  if (frame <= first.frame) {
    const [a, b] = INTRO_SETTLE
    return [INTRO, first, smooth(Math.min(Math.max((frame - a) / (b - a), 0), 1))]
  }
  for (let k = 1; k < FRAMING.length; k++) {
    const a = FRAMING[k - 1]
    const b = FRAMING[k]
    if (frame <= b.frame) return [a, b, smooth((frame - a.frame) / (b.frame - a.frame))]
  }
  return [FRAMING.at(-1), FRAMING.at(-1), 0]
}

/** Where one framing key puts an iw×ih image on a cw×ch canvas. */
function place(key, cw, ch, iw, ih) {
  const unit = Math.min(cw / 1440, ch / 900) // one Figma pixel
  const boxH = 900 * unit
  const boxTop = (ch - boxH) / 2
  const s = Math.max(cw / iw, ch / ih) * key.zoom
  const dw = iw * s
  const dh = ih * s
  let y = (ch - dh) / 2 + key.offsetY * boxH
  if (key.bottom) y = ch - dh // bottom edge on the screen's bottom edge, whatever the window shape
  else if (!key.intro) {
    y = Math.max(y, ch - dh) // the body always reaches the bottom of the screen
    if (key.minTop != null) y = Math.max(y, boxTop + key.minTop * unit - key.charTop * dh)
  }
  let x = (cw - dw) / 2 + key.offsetX * boxH
  if (key.fullWidth) x = Math.min(0, Math.max(cw - dw, x)) // no gap at either side
  return { s, x, y }
}

// Intro frames are opaque. On a scaled stage (phones / tablets) the space
// around it takes the colour of the frame's own edges while the intro plays
// (black while the bars are closed, white once they open), so the intro still
// reads as filling the screen; the pixel background fades in after it.
const edgeCtx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true })
function edgeColour(img) {
  const w = img.naturalWidth ?? img.width
  const h = img.naturalHeight ?? img.height
  const sum = [0, 0, 0]
  for (const [x, y, sw, sh] of [[0, 0, w, 4], [0, h - 4, w, 4], [0, 0, 4, h], [w - 4, 0, 4, h]]) {
    edgeCtx.drawImage(img, x, y, sw, sh, 0, 0, 1, 1)
    const d = edgeCtx.getImageData(0, 0, 1, 1).data
    for (let k = 0; k < 3; k++) sum[k] += d[k] / 4
  }
  return `rgb(${sum.map(Math.round).join(',')})`
}

const probe = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true })

export class FramePlayer {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.cache = null // FrameCache (decoded window of frames)
    this.stills = null // see loadStills()
    this.frame = -1
    this.still = null
    this.img = null
    this.px = 0 // mouse parallax offset (CSS px), see setParallax
    this.py = 0
    this.surround = null // scaled stage: the element around it, coloured like the intro's edges
    this.resize()
  }

  /** A point of the frame (0..1 across / down) in screen (CSS) px. */
  toScreen(fx, fy) {
    const p = this.placed
    if (!p) return null
    const r = this.canvas.getBoundingClientRect()
    return { x: r.left + (p.x + fx * p.w) / this.dpr, y: r.top + (p.y + fy * p.h) / this.dpr }
  }

  /**
   * How opaque the character is at a screen point (CSS px), 0..255. Read from
   * the frame image through a 1px scratch canvas, not from the screen canvas
   * (reading pixels back from that one would slow its drawing down).
   */
  alphaAt(x, y) {
    const p = this.placed
    const img = this.img
    if (!p || !img || !(img.width || img.naturalWidth)) return 0
    const r = this.canvas.getBoundingClientRect()
    const iw = img.naturalWidth ?? img.width
    const ih = img.naturalHeight ?? img.height
    const ix = (((x - r.left) * this.dpr - p.x) / p.w) * iw
    const iy = (((y - r.top) * this.dpr - p.y) / p.h) * ih
    if (ix < 0 || iy < 0 || ix >= iw || iy >= ih) return 0
    probe.clearRect(0, 0, 1, 1)
    probe.drawImage(img, Math.floor(ix), Math.floor(iy), 1, 1, 0, 0, 1, 1)
    return probe.getImageData(0, 0, 1, 1).data[3]
  }

  /** Shift the character a few px with the mouse (depth parallax). */
  setParallax(x, y) {
    this.px = x
    this.py = y
    if (this.img) this.render(this.frame, this.still, true)
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.dpr = dpr // canvas px per on-screen CSS px
    // sized to what's on screen (a scaled stage draws at its displayed size, so it stays sharp)
    const r = this.canvas.getBoundingClientRect()
    this.canvas.width = Math.round(r.width * this.dpr)
    this.canvas.height = Math.round(r.height * this.dpr)
    this.render(Math.max(this.frame, 0), this.still, true)
  }

  /** A frame (or a page's still) finished decoding: redraw if it's better than what's shown. */
  refresh(i) {
    if (this.exact) return
    // the exact frame arrived, or nothing could be drawn for this frame yet (then anything near is better)
    if (i == null || i === Math.round(this.frame) || this.blank) this.render(this.frame, this.still, true)
  }

  /**
   * Draw `frame` (may be fractional: the image is the nearest frame, the
   * framing is interpolated between FRAMING keys). Nothing is masked, faded
   * or feathered: the character is always drawn fully opaque.
   */
  render(frame, stillId = null, force = false) {
    if (!force && this.img && frame === this.frame && stillId === this.still) return
    const index = Math.round(frame)
    if (!stillId) this.stills?.drop() // only the page being shown keeps its 4K still decoded
    const still = stillId ? this.stills?.get(stillId, () => this.render(this.frame, this.still, true)) : null
    // the exact frame, else the nearest decoded one (it is redrawn when the exact one is ready)
    const got = still ? { img: still, exact: true } : this.cache?.get(index)
    this.frame = frame
    this.still = stillId
    this.blank = !got // nothing decoded yet: redraw as soon as something is
    if (!got) {
      this.exact = false
      return
    }
    const img = got.img
    this.exact = got.exact
    this.img = img

    const { width: cw, height: ch } = this.canvas
    const iw = img.naturalWidth ?? img.width
    const ih = img.naturalHeight ?? img.height
    const [ka, kb, t] = keysAt(frame)
    const a = place(ka, cw, ch, iw, ih)
    const b = place(kb, cw, ch, iw, ih)
    const s = lerp(a.s, b.s, t)

    const ctx = this.ctx
    ctx.clearRect(0, 0, cw, ch)
    if (this.surround) this.surround.style.backgroundColor = index < FRAMES.introEnd ? edgeColour(img) : ''
    ctx.imageSmoothingQuality = 'high'
    let x = lerp(a.x, b.x, t)
    let y = lerp(a.y, b.y, t)
    if (this.px || this.py) {
      // never uncover an edge the frame was covering (body at the bottom, hands at the sides)
      const keep = (p, shift, size, view) => {
        let v = p + shift
        if (p <= 0.5) v = Math.min(v, 0)
        if (p + size >= view - 0.5) v = Math.max(v, view - size)
        return v
      }
      x = keep(x, this.px * this.dpr, iw * s, cw)
      y = keep(y, this.py * this.dpr, ih * s, ch)
    }
    ctx.drawImage(img, x, y, iw * s, ih * s)
    this.placed = { x, y, w: iw * s, h: ih * s } // canvas px, for toScreen
  }
}
