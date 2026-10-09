import gsap from 'gsap'
import { PAGES } from '../config'
import { store } from './store'
import { FramePlayer, pickSize } from './frames'
import { FrameCache, loadFrames, loadStills } from './frameCache'
import { wantedSet } from './frameSet'
import { isScaled, onViewportChange } from './viewport'
import { reducedMotion } from '../fx/env'

const pos = { frame: 0 }
let set = wantedSet() // the version of the animation shown (16:9, or 9:16 on phones held upright)
let player = null
let tween = null
let dir = 0 // which way the playhead is moving (+1 / -1), 0 at rest: steers the decode window
let stride = 1 // 2 during long fast-forward jumps: only every other frame is decoded ahead
const frameListeners = new Set()

/** Subscribe to the playhead (fractional frame), e.g. to sync UI with the frames. */
export function onFrame(cb) {
  frameListeners.add(cb)
  cb(pos.frame)
  return () => frameListeners.delete(cb)
}

function draw() {
  const { arrived, page } = store.get()
  const still = arrived && PAGES[page].frame === Math.round(pos.frame) ? PAGES[page].id : null
  cache?.focus(pos.frame, dir, stride)
  player?.render(pos.frame, still)
  frameListeners.forEach((cb) => cb(pos.frame))
}

// Page changes run on a "moving frames" axis where each HOLD collapses to a
// single point. toMoving/toReal convert between that axis and real frames.
function toMoving(frame) {
  let v = frame
  for (const [s, e] of set.holds) if (frame > s) v -= Math.min(frame, e) - s
  return v
}
function toReal(v) {
  let frame = v
  for (const [s, e] of set.holds) if (frame > s) frame += e - s
  return frame
}

let loader = null
let cache = null
let stills = null
let pendingPage = null // a page change waiting for its frames to download

// The preloader's logo loop is the first thing shown: frames start downloading
// once it can play (or after a short wait), so they don't hold it up.
let logoReady
const logoGate = new Promise((resolve) => {
  logoReady = resolve
  setTimeout(resolve, 1200)
})
/** The preloader's logo video can play (called by the Preloader). */
export const onLogoReady = () => logoReady()

let resolveReady
const framesReady = new Promise((r) => (resolveReady = r))

/**
 * Start downloading the frame set (compressed). Called once, before React
 * renders. The intro can start as soon as its own frames are in and the first
 * few are decoded; the rest keeps downloading while it plays.
 */
export function startLoading() {
  load()
}

/**
 * Download `set` at the size for this screen. Again when the screen switches
 * to the other set (a phone turned between upright and sideways): then the
 * frames being shown come first, and the old set's frames are let go.
 */
function load() {
  const size = pickSize(set)
  const started = store.get().phase !== 'preload'
  loader?.stop()
  cache?.dispose()
  stills?.drop()
  const mine = (loader = loadFrames(
    set,
    size,
    (p) => {
      if (loader !== mine) return
      store.set({ loaded: p })
      cache?.refill()
    },
    logoGate,
    started ? [Math.round(pos.frame), ...PAGES.map((p) => p.frame)] : [],
  ))
  const aspect = set.id === 'portrait' ? 16 / 9 : 9 / 16
  cache = new FrameCache(set, loader.blobs, size * Math.round(size * aspect) * 4, (f) => player?.refresh(f))
  stills = null
  if (player) Object.assign(player, { cache, stills })
  if (started) {
    // switched mid-visit: the stills now, and the current frame as soon as it's in
    stills = loadStills(set)
    if (player) player.stills = stills
    cache.focus(pos.frame, 0)
    draw()
    return
  }
  loader.intro.then(async () => {
    if (loader !== mine) return
    // the 4K stills are only for resting on a page: fetched after the intro frames
    stills = loadStills(set)
    if (player) player.stills = stills
    cache.focus(0, 1)
    await Promise.all([0, 1, 2, 3, 4, 5].map((f) => cache.whenDecoded(f)))
    if (loader !== mine) return
    draw()
    resolveReady()
  })
}

/** The screen now wants the other set: switch, keeping the page and playhead. */
function switchSet() {
  set = wantedSet()
  if (player) {
    player.set = set
    player.room = null
  }
  load()
  // a page change that was waiting for the old set's frames waits for the new ones
  if (pendingPage !== null) {
    const p = pendingPage
    pendingPage = null
    goTo(p)
  }
}

export const whenFramesReady = () => framesReady

/** Bind (or re-bind) the canvas the frames are drawn to. */
export function attachCanvas(canvas) {
  player = new FramePlayer(canvas, set)
  if (import.meta.env.DEV) (window.__akPlayer = player), (window.__akCache = cache)
  player.cache = cache
  player.stills = stills
  const surround = () => (player.surround = isScaled() ? canvas.closest('.stage') : null)
  surround()
  player.render(pos.frame, null, true)
  const onResize = () => {
    if (wantedSet() !== set) switchSet()
    if (!isScaled() && player.surround) player.surround.style.backgroundColor = ''
    surround()
    player.resize()
  }
  window.addEventListener('resize', onResize)
  const offMedia = onViewportChange(onResize) // scale / mode changes (rotation)
  return () => {
    window.removeEventListener('resize', onResize)
    offMedia()
  }
}

/** Intro: frames 0 -> Home freeze play automatically at the video's own speed. */
export function playIntro() {
  if (store.get().phase !== 'preload') return
  store.set({ phase: 'intro' })
  const home = PAGES[0].frame
  if (reducedMotion()) {
    // reduced motion: no intro animation, straight to Home
    pos.frame = home
    tween = gsap.delayedCall(0.4, () => arrive(0))
    draw()
    return
  }
  dir = 1
  tween = gsap.to(pos, {
    frame: home,
    duration: home / set.frames.fps,
    ease: 'none',
    onUpdate: draw,
    onComplete: () => arrive(0),
  })
}

function arrive(i) {
  dir = 0
  stride = 1
  store.set({ phase: 'ready', page: i, arrived: true })
  draw()
}

/** Play the frames forward or backward to page i. Long jumps fast-forward. */
export function goTo(i) {
  const s = store.get()
  if (s.phase !== 'ready') return
  i = gsap.utils.clamp(0, PAGES.length - 1, i)
  if (i === s.page && (s.arrived || tween?.isActive())) return
  const target = PAGES[i].frame
  // on a slow connection the frames ahead may not be in yet: start once they are
  if (!loader.fetched(Math.max(target, Math.round(pos.frame)))) {
    if (pendingPage === null) loader.until(Math.max(target, Math.round(pos.frame))).then(() => {
      const p = pendingPage
      pendingPage = null
      if (p !== null) goTo(p)
    })
    pendingPage = i
    return
  }
  pendingPage = null
  const playhead = { v: toMoving(pos.frame) }
  const to = toMoving(target)
  const dist = Math.abs(to - playhead.v)
  const long = dist > 90
  const duration = long ? gsap.utils.clamp(1.3, 2.2, dist / 100) : Math.max(0.6, dist / 36)
  const ease = long ? 'power2.inOut' : 'power1.inOut'
  tween?.kill()
  if (reducedMotion()) return cut(i)
  dir = Math.sign(target - pos.frame)
  stride = long ? 2 : 1
  store.set({ page: i, arrived: false, transition: { duration, ease } })
  tween = gsap.to(playhead, {
    v: to,
    duration,
    ease,
    onUpdate: () => {
      pos.frame = toReal(playhead.v)
      draw()
    },
    onComplete: () => {
      pos.frame = target
      arrive(i)
    },
  })
}

/** Reduced motion: no frame animation between pages, just a quick fade of the character. */
function cut(i) {
  const canvas = player?.canvas
  dir = 0
  store.set({ page: i, arrived: false, transition: { duration: 0.45, ease: 'none' } })
  tween = gsap
    .timeline({ onComplete: () => arrive(i) })
    .to(canvas, { opacity: 0, duration: 0.18, ease: 'power1.in' })
    .call(() => {
      pos.frame = PAGES[i].frame
      draw()
    })
    .to(canvas, { opacity: 1, duration: 0.27, ease: 'power1.out' })
}

/** Jump straight to page i with no animation (dev deep links). */
export function jumpTo(i) {
  tween?.kill()
  dir = 0
  pos.frame = PAGES[i].frame
  store.set({ phase: 'ready', page: i, arrived: true })
  draw()
}

/** Where a point of the current frame (0..1, 0..1) is on screen. */
export const frameToScreen = (fx, fy) => player?.toScreen(fx, fy) ?? null

/** How opaque the character is at a screen point (0..255), e.g. to know if a click hit him. */
export const characterAlphaAt = (x, y) => player?.alphaAt(x, y) ?? 0

/** Mouse depth parallax for the character (CSS px). */
export const setParallax = (x, y) => player?.setParallax(x, y)

/** Which version of the animation is shown: 'landscape' or 'portrait'. */
export const frameSetId = () => set.id

/**
 * Portrait: each page's text, { [page id]: { clear, reserve } } in CSS px
 * (engine/portraitLayout.js). The character is framed to stay clear of it.
 */
export function setPortraitRoom(room) {
  if (!player) return
  player.room = room
  player.render(pos.frame, player.still, true)
}

/** Portrait: where page `id`'s freeze frame sits at rest, { x, y, w, h } in CSS px. */
export const restingPlacement = (id) => player?.restingPlacement(PAGES.find((p) => p.id === id).frame) ?? null

/** Dev only: show any frame (fractional), e.g. to check the camera. */
export function devSeek(frame) {
  tween?.kill()
  pos.frame = frame
  draw()
}

export const next = () => goTo(store.get().page + 1)
export const prev = () => goTo(store.get().page - 1)
export const isMoving = () => !!tween?.isActive()
