import { useEffect, useRef } from 'react'
import { PAGES } from './config'
import { attachCanvas, goTo } from './engine/experience'
import { bindInput } from './engine/input'
import { bindParallax } from './fx/parallax'
import { bindUiSounds } from './fx/sound'
import { bindEggs } from './fx/eggs'
import { useStore } from './engine/store'
import PixelBackground from './components/PixelBackground'
import Preloader from './components/Preloader'
import Cartridges from './components/Cartridges'
import ProjectView from './components/ProjectView'
import AchievementToast from './components/AchievementToast'
import SpeechBubble from './components/SpeechBubble'
import { bindRoutes } from './engine/projects'
import Header from './components/Header'
import RotateOverlay from './components/RotateOverlay'
import SeoText from './components/SeoText'
import Nav from './components/Nav'
import ScrollHint from './components/ScrollHint'
import AboutBand from './components/AboutBand'
import Home from './pages/Home'
import About from './pages/About'
import Projects from './pages/Projects'
import Contact from './pages/Contact'

const PROJECTS_PAGE = PAGES.findIndex((p) => p.id === 'projects')

export default function App() {
  const canvas = useRef(null)
  const phase = useStore((s) => s.phase)
  const page = useStore((s) => s.page)

  useEffect(() => attachCanvas(canvas.current), [])
  useEffect(() => bindInput(), [])
  useEffect(() => bindParallax(), [])
  useEffect(() => bindUiSounds(), [])
  useEffect(() => bindEggs(), [])
  useEffect(() => bindRoutes(), [])

  // a direct link to a project: once the intro is done, bring the Projects page
  // up behind the project view so closing it lands there
  const openSlug = useStore((s) => s.openSlug)
  useEffect(() => {
    if (phase === 'ready' && openSlug) goTo(PROJECTS_PAGE)
  }, [phase, openSlug])

  return (
    <>
      {/* first in the document: its logo video is the first request */}
      <Preloader />
      <main className="stage" data-phase={phase} data-page={PAGES[page].id}>
        {/* 1. pixel background (always the whole screen: on phones / tablets it
               also fills the space around the scaled stage) */}
        <PixelBackground />
        {/* the stage: the whole window on desktop; on phones / tablets the
            1920×1080 desktop layout scaled to fit (engine/viewport.js) */}
        <div className="stage-scaler">
          {/* 2. content behind the character (Projects cartridges) */}
          <div className="layer layer-behind">
            <div className="ui-box">
              <Cartridges />
            </div>
          </div>
          {/* 3. character frames */}
          <canvas ref={canvas} className="layer layer-canvas" aria-hidden="true" />
          {/* 4. UI */}
          <div className="layer layer-ui">
            <Header />
            <div className="ui-box">
              <Nav />
              <Home />
              <About />
              <Projects />
              <Contact />
            </div>
            <AboutBand />
            <ScrollHint />
          </div>
        </div>
      </main>
      <SeoText />
      <ProjectView />
      <AchievementToast />
      <SpeechBubble />
      <RotateOverlay />
    </>
  )
}
