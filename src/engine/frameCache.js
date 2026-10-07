import { FRAMES, HOLDS, PAGES } from '../config'
import { isPhone } from './viewport'

// Frames are downloaded once as compressed WebP bytes (~18 MB for the 1920 set)
// and only a small window of them is decoded at a time: decoded frames cost
// width × height × 4 bytes each (8 MB at 1920), so keeping all 313 decoded
// would need over 1 GB, enough to make iPhone Safari reload the tab.

const CONCURRENT_FETCHES = 6
const CONCURRENT_DECODES = 6
// decoded-frame budget, in bytes (the 4 page freeze frames are kept on top of it)
const BUDGET = () => (isPhone() ? 200 : 300) * 1024 * 1024

/**
 * Download every frame of one size set as compressed bytes, in playback order,
 * starting once `gate` resolves. `intro` resolves when the intro frames
 * (0 → Home) are in, `all` when every frame is. A missing frame stays null and
 * falls back to a neighbour.
 */
export function loadFrames(size, onProgress, gate = Promise.resolve()) {
  const blobs = new Array(FRAMES.count).fill(undefined)
  const introCount = FRAMES.introEnd + 1
  let next = 0
  let done = 0
  let introDone = 0
  let resolveIntro, resolveAll
  const intro = new Promise((r) => (resolveIntro = r))
  const all = new Promise((r) => (resolveAll = r))
  const waiters = new Set() // { upTo, resolve }

  const loadNext = () => {
    if (next >= FRAMES.count) return
    const i = next++
    // low priority: the logo loop (preloader) and the page itself come first
    fetch(FRAMES.path(size, i), { priority: 'low' })
      .then((r) => (r.ok ? r.blob() : null))
      .catch(() => null)
      .then((blob) => {
        blobs[i] = blob
        done++
        if (i < introCount && ++introDone === introCount) resolveIntro()
        onProgress(done / FRAMES.count)
        for (const w of waiters) if (fetchedUpTo() >= w.upTo) (waiters.delete(w), w.resolve())
        if (done === FRAMES.count) resolveAll()
        else loadNext()
      })
  }
  // frames arrive roughly in order; this is the last frame with everything before it in
  let upTo = -1
  const fetchedUpTo = () => {
    while (upTo + 1 < FRAMES.count && blobs[upTo + 1] !== undefined) upTo++
    return upTo
  }
  gate.then(() => {
    for (let k = 0; k < CONCURRENT_FETCHES; k++) loadNext()
  })

  /** Resolves once every frame up to `frame` has been downloaded. */
  const until = (frame) =>
    fetchedUpTo() >= frame ? Promise.resolve() : new Promise((resolve) => waiters.add({ upTo: frame, resolve }))

  /** Is every frame up to `frame` downloaded? */
  const fetched = (frame) => fetchedUpTo() >= frame

  return { blobs, intro, all, until, fetched }
}

/** Decode a WebP blob: an ImageBitmap where supported, else an <img>. */
async function decode(blob) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(blob)
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}
const release = (bmp) => bmp?.close?.()

// During a page change the frames inside a HOLD are skipped (see experience.js),
// so the window steps over them too.
function step(f, dir) {
  let n = f + dir
  for (const [s, e] of HOLDS) {
    if (dir > 0 && n > s && n < e) n = e
    if (dir < 0 && n < e && n > s) n = s
  }
  return n
}

const PINNED = new Set(PAGES.map((p) => p.frame)) // page freeze frames: always kept

/**
 * Keeps a window of decoded frames around the playhead: mostly ahead in the
 * direction of travel (both ways when resting on a page), evicting the
 * farthest ones when over budget.
 */
export class FrameCache {
  constructor(blobs, frameBytes, onDecoded) {
    this.blobs = blobs
    this.decoded = new Map() // frame -> bitmap
    this.decoding = new Set()
    this.queue = []
    this.onDecoded = onDecoded
    this.size = Math.max(16, Math.min(60, Math.floor(BUDGET() / frameBytes)))
    this.at = 0
    this.dir = 0
  }

  /** The decoded frame i, or the nearest decoded one (so a frame is never blank). */
  get(i) {
    const exact = this.decoded.get(i)
    if (exact) return { img: exact, exact: true }
    let best = null
    let dist = Infinity
    for (const [f, img] of this.decoded) {
      const d = Math.abs(f - i)
      if (d < dist) (dist = d), (best = img)
    }
    return best ? { img: best, exact: false } : null
  }

  /**
   * Re-centre the window on `frame`, moving in `dir` (+1 / -1, or 0 when resting).
   * `stride` 2 decodes every other frame ahead (long fast-forward jumps play
   * faster than the screen can show every frame anyway).
   */
  focus(frame, dir, stride = 1) {
    const at = Math.max(0, Math.min(FRAMES.count - 1, Math.round(frame)))
    this.at = at
    this.dir = dir
    this.stride = stride
    const want = [at]
    // frames from `at` going `d`, n of them; with a stride, only frames on a fixed
    // lattice (f % stride === 0), so the kept set doesn't flip as the playhead moves
    const walk = (d, n, every = 1) => {
      const out = []
      for (let f = step(at, d); f >= 0 && f < FRAMES.count && out.length < n; f = step(f, d)) if (f % every === 0) out.push(f)
      return out
    }
    if (dir) {
      const ahead = walk(dir, Math.ceil(this.size * 0.8), stride)
      want.push(...ahead, ...walk(-dir, this.size - 1 - ahead.length))
    } else {
      // resting: both ways, nearest first, so either direction starts smoothly
      // (at the first / last page the whole window goes the one way there is)
      const a = walk(1, this.size)
      const b = walk(-1, this.size)
      for (let k = 0; want.length < this.size && (k < a.length || k < b.length); k++) {
        if (k < a.length) want.push(a[k])
        if (k < b.length && want.length < this.size) want.push(b[k])
      }
    }
    const keep = new Set(want)
    PINNED.forEach((f) => keep.add(f))
    // frames already decoded in the stretch about to play stay (a little over budget is fine)
    if (dir) {
      const end = want.reduce((e, f) => ((f - at) * dir > (e - at) * dir ? f : e), at)
      for (const f of this.decoded.keys())
        if (!keep.has(f) && (f - at) * dir > 0 && (end - f) * dir > 0 && keep.size < this.size * 1.4) keep.add(f)
    }
    // evict what fell out of the window
    for (const [f, img] of this.decoded) {
      if (!keep.has(f)) (release(img), this.decoded.delete(f))
    }
    // queue the rest, nearest first
    this.queue = want.filter((f) => !this.decoded.has(f) && !this.decoding.has(f))
    for (const f of PINNED) if (!this.decoded.has(f) && !this.decoding.has(f)) this.queue.push(f)
    this.keep = keep
    this.pump()
  }

  pump() {
    while (this.decoding.size < CONCURRENT_DECODES && this.queue.length) {
      const f = this.queue.shift()
      const blob = this.blobs[f]
      if (!blob) continue // not downloaded yet (or missing): picked up on a later focus
      this.decoding.add(f)
      decode(blob)
        .then((img) => {
          if (this.keep?.has(f)) {
            this.decoded.set(f, img)
            this.onDecoded?.(f)
          } else release(img)
        })
        .catch(() => {})
        .finally(() => {
          this.decoding.delete(f)
          this.pump()
        })
    }
  }

  /** More frames have downloaded: fill the current window with them. */
  refill() {
    this.focus(this.at, this.dir, this.stride)
  }

  /** Resolves when frame `f` is decoded (used to start the intro on a ready frame). */
  whenDecoded(f) {
    return new Promise((resolve) => {
      const check = () => (this.decoded.has(f) ? resolve() : setTimeout(check, 30))
      check()
    })
  }
}

/** 4K stills, one per page: downloaded up front, decoded only for the page shown. */
export function loadStills() {
  const blobs = {}
  for (const p of PAGES) {
    fetch(FRAMES.still(p.id), { priority: 'low' })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => b && (blobs[p.id] = b))
      .catch(() => {})
  }
  let current = null // { id, img }
  let loading = null
  return {
    /** The decoded still for page `id`, or null (it decodes in the background; `onReady` fires when it can be drawn). */
    get(id, onReady) {
      if (current?.id === id) return current.img
      if (!id || !blobs[id] || loading === id) return null
      loading = id
      decode(blobs[id])
        .then((img) => {
          if (loading !== id) return release(img)
          release(current?.img)
          current = { id, img }
          loading = null
          onReady?.()
        })
        .catch(() => (loading = null))
      return null
    },
    /** Free the decoded still (when leaving a page). */
    drop() {
      release(current?.img)
      current = null
      loading = null
    },
  }
}
