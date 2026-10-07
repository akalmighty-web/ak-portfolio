// Site-wide settings. Edit links, timings and page freeze frames here.

export const EMAIL = '25akalmighty@gmail.com'
export const CV_URL = '/cv/Ananthkrishnan-CV-2026.pdf'

export const SOCIALS = {
  instagram: 'https://www.instagram.com/a.k.almighty',
  linkedin: 'https://www.linkedin.com/in/ananthkrishnan2255',
  artstation: 'https://www.artstation.com/ananthkrishnan2',
  behance: 'https://www.behance.net/ananthkrishnan1',
}

// Home stats: count up from 0 the first time Home appears.
export const STATS = [
  { value: 3, suffix: '+', label: 'Years of experience' },
  { value: 6, suffix: '+', label: 'Shipped projects' },
  { value: 2, suffix: '+', label: 'Game titles' },
]

// About: the "Worked with / Awards" band. `file` is the image's name in
// assets/worked with/ or assets/Awards/ (run scripts/build_band.py after adding one).
export const BAND = {
  workedWith: [
    { file: 'Rectangle.png', name: 'GAPE' },
    { file: 'image 20.png', name: 'Battlegrounds Mobile India' },
    { file: 'Group 2.png', name: 'Picsodian Studios' },
    { file: 'enhance_this_fifa_2026_logo_202606121409 1.png', name: 'FIFA World Cup 2026' },
    { file: 'eesl 1.png', name: 'EESL' },
  ],
  awards: [
    { file: 'Group 4303.png', name: 'Kuala Lumpur International Film Awards 2025' },
    { file: 'Group 56.png', name: 'Young Creative Awards 2024' },
    { file: 'OFFICIAL SELECTION - Arctic International Film Festival Golden raven - 2025.png', name: 'Arctic International Film Festival «Golden Raven» 2025' },
    { file: 'Group 60.png', name: "CMS International Children's Film Festival (ICFF) 2025" },
    { file: 'Group 61.png', name: "Festival l'Art en Chemin 2024" },
    { file: 'Mask group-1.png', name: 'Heritales – International Heritage Film Festival 2024' },
    { file: 'Mask group-2.png', name: 'Honor Film Festival 2025' },
    { file: 'Mask group.png', name: 'T-Short 2024' },
    { file: 'OFFICIAL SELECTION - ICJ International Film Award - 2027 1.png', name: 'ICJ International Film Award 2027' },
  ],
}

// Frame sequence produced by process_frames.py
export const FRAMES = {
  count: 313, // 0000.webp .. 0312.webp
  introEnd: 120, // 0..119 play automatically, 120 = Home freeze
  sizes: [1280, 1920, 2560],
  fps: 30,
  // Browsers keep the frames for a year (vercel.json). After re-rendering the
  // animation, raise this number so every visitor gets the new frames.
  version: 1,
  path: (size, i) => `/frames/${size}/${String(i).padStart(4, '0')}.webp?v=${FRAMES.version}`,
  still: (name) => `/frames/stills/${name}.webp?v=${FRAMES.version}`,
}

// Scroll-controlled pages: `frame` is the freeze frame.
export const PAGES = [
  { id: 'home', label: 'Home', frame: 120 },
  { id: 'about', label: 'About', frame: 180 },
  { id: 'projects', label: 'Projects', frame: 252 },
  { id: 'contact', label: 'Contact', frame: 310 },
]

// How the character frame is placed, keyed by frame and interpolated between keys.
// Every page uses the same base scale (cover-fit: the frame always spans the
// screen), so no page is zoomed more than another unless `zoom` says so.
//   zoom      scale on top of cover-fit (About is drawn a little smaller, as in the Figma frame)
//   offsetX/Y shift, as a fraction of the design height (900 = 1.0)
//   minTop    the character's top edge stays at or below this Figma y, so on very
//             wide windows (where cover-fit makes him bigger) he moves down, never into the UI
//   charTop   where the character's top edge is in that frame (fraction of frame height, measured)
//   fullWidth the frame is kept flush with both screen sides (set where the hands
//             touch the frame sides: frames 194–270; needs zoom 1)
//   bottom    the frame's bottom edge sits exactly on the screen's bottom edge
//             (Contact: the eyes are at the bottom of the frame and must never be cropped)
export const FRAMING = [
  { frame: 120, zoom: 0.98, offsetX: 0, offsetY: 0.098, minTop: 296, charTop: 0.2259 }, // Home
  { frame: 180, zoom: 0.9, offsetX: 0.035, offsetY: 0.05, minTop: 150, charTop: 0.0806 }, // About
  { frame: 192, zoom: 1, offsetX: 0, offsetY: 0.05, fullWidth: true }, // before the hands enter
  { frame: 252, zoom: 1, offsetX: 0, offsetY: 0, minTop: 380, charTop: 0.4444, fullWidth: true }, // Projects
  { frame: 310, zoom: 1, offsetX: 0, offsetY: 0, bottom: true }, // Contact
]

// The intro eases into Home's framing over these frames (the background is plain white by then)
export const INTRO_SETTLE = [100, 120]

// Frame ranges where the character holds still (measured: < 1% pixel change).
// Page changes step over them, so a scroll gets an immediate response and
// transition time is spent on frames that actually move.
export const HOLDS = [
  [120, 144], // Home pose held after the freeze frame
  [240, 263], // Projects hands, around the freeze frame
]

// The nav moves from under the title to the top centre while the frames play
// through this range (the turn from Home into the About pose).
export const NAV_MOVE = [146, 176]

export const SCROLL_HINT_DELAY = 10 // seconds of no scrolling before the hint shows
