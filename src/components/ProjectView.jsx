import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import Lenis from 'lenis'
import { categoryLabel } from '../data/projects'
import { closeProject, projectBySlug } from '../engine/projects'
import { useStore } from '../engine/store'
import { trapFocus } from '../engine/focusTrap'

/**
 * Behance-style project view. The page behind blurs, a panel slides up with
 * a header (back button, project name, category) and a long vertical run of
 * full-width images, looping videos and embeds. Closes with the back button,
 * Esc, a click on the blurred backdrop, or the browser's back button.
 */
export default function ProjectView() {
  const slug = useStore((s) => (s.phase === 'ready' ? s.openSlug : null))
  const [project, setProject] = useState(null) // stays set during the close animation
  const root = useRef(null)

  useEffect(() => {
    if (slug) setProject(projectBySlug(slug))
  }, [slug])

  // slide in / out
  useLayoutEffect(() => {
    if (!project || !root.current) return
    const q = gsap.utils.selector(root)
    if (slug) {
      gsap.fromTo(q('.pv-backdrop'), { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' })
      gsap.fromTo(q('.pv-panel'), { yPercent: 100 }, { yPercent: 0, duration: 0.8, ease: 'power4.out' })
      q('.pv-back')[0]?.focus({ preventScroll: true })
    } else {
      gsap.to(q('.pv-backdrop'), { opacity: 0, duration: 0.4, ease: 'power2.in', delay: 0.1 })
      gsap.to(q('.pv-panel'), {
        yPercent: 100,
        duration: 0.55,
        ease: 'power3.in',
        onComplete: () => {
          setProject(null)
          document.querySelector('.stage')?.removeAttribute('inert') // so focus can go back to the cartridge
          document.querySelector('.cartridge.is-active .cartridge-inner')?.focus({ preventScroll: true })
        },
      })
    }
  }, [slug, project])

  if (!project) return null
  return <Panel key={project.slug} root={root} project={project} />
}

function Panel({ root, project }) {
  const scroller = useRef(null)
  const content = useRef(null)

  // smooth scrolling inside the panel; Esc closes; keyboard focus stays in the
  // dialog and the page behind is inert while it's open
  useEffect(() => {
    const lenis = new Lenis({ wrapper: scroller.current, content: content.current, lerp: 0.12 })
    const raf = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    const onKey = (e) => e.key === 'Escape' && closeProject()
    window.addEventListener('keydown', onKey)
    const untrap = trapFocus(root.current)
    const page = document.querySelector('.stage')
    page?.setAttribute('inert', '')
    return () => {
      gsap.ticker.remove(raf)
      lenis.destroy()
      window.removeEventListener('keydown', onKey)
      untrap()
      page?.removeAttribute('inert')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // looping videos only play while on screen
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause())),
      { root: scroller.current, threshold: 0.2 },
    )
    content.current.querySelectorAll('video[data-loop]').forEach((v) => io.observe(v))
    return () => io.disconnect()
  }, [])

  return (
    <div ref={root} className="pv" role="dialog" aria-modal="true" aria-labelledby="pv-title">
      <div className="pv-backdrop" onClick={closeProject} />
      <div className="pv-panel">
        <div ref={scroller} className="pv-scroller" data-native-scroll>
          <div ref={content}>
            <header className="pv-header">
              <button type="button" className="pv-back" onClick={closeProject} aria-label="Back to projects">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 12H5M11 6l-6 6 6 6" />
                </svg>
              </button>
              <div className="pv-titles">
                <h2 id="pv-title" className="pv-title">
                  {project.title}
                </h2>
                <p className="pv-category">{categoryLabel(project.category)}</p>
              </div>
              {project.behance && (
                <a className="pv-behance" href={project.behance} target="_blank" rel="noopener noreferrer">
                  View on Behance
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M7 17 17 7M8.5 7H17v8.5" />
                  </svg>
                </a>
              )}
            </header>

            {project.description && <Description text={project.description} />}

            <div className="pv-media">
              {project.media.map((m, i) => (
                <Media key={i} item={m} title={project.title} index={i} />
              ))}
            </div>

            <footer className="pv-footer">
              <button type="button" className="pv-footer-back" onClick={closeProject}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 12H5M11 6l-6 6 6 6" />
                </svg>
                Back to projects
              </button>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The project's description (from Behance), between the header and the work:
 * a blank line starts a new paragraph, a line break stays a line break, and a
 * paragraph starting with "# " is a heading.
 */
function Description({ text }) {
  return (
    <div className="pv-intro">
      {text.split(/\n{2,}/).map((block, i) => {
        if (block.startsWith('# ')) return <h3 key={i}>{block.slice(2)}</h3>
        const lines = block.split('\n')
        return (
          <p key={i}>
            {lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {line}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

function Media({ item, title, index }) {
  const ratio = { aspectRatio: `${item.width} / ${item.height}` }
  if (item.type === 'image')
    return (
      <img
        className="pv-item"
        style={ratio}
        src={item.src}
        srcSet={item.srcset}
        sizes="(min-width: 1440px) 1400px, 100vw"
        width={item.width}
        height={item.height}
        loading={index < 2 ? 'eager' : 'lazy'}
        decoding="async"
        alt={`${title}, image ${index + 1}`}
      />
    )
  if (item.type === 'video')
    return item.loop ? (
      <video className="pv-item" style={ratio} src={item.src} poster={item.poster} muted loop playsInline preload="metadata" data-loop aria-label={`${title}, animation ${index + 1}`} />
    ) : (
      <video className="pv-item" style={ratio} src={item.src} controls playsInline preload="metadata" />
    )
  if (item.type === 'youtube')
    return (
      <div className="pv-item pv-embed" style={ratio}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${item.id}?rel=0`}
          title={`${title}, video`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  return null
}
