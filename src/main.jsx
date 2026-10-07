import { createRoot } from 'react-dom/client'
import gsap from 'gsap'
import { PAGES } from './config'
import { devSeek, goTo, jumpTo, onFrame, startLoading, whenFramesReady } from './engine/experience'
import { store } from './engine/store'
import App from './App'
import { consoleHello } from './fx/eggs'
import './styles/fonts.css'
import './styles/base.css'
import './styles/ui.css'
import './styles/home.css'
import './styles/pages.css'
import './styles/project-view.css'
import './styles/fx.css'

// dev only: lets tooling step the timeline when the tab can't animate
if (import.meta.env.DEV) window.__ak = { gsap, store, goTo, onFrame, seek: devSeek }

startLoading()
consoleHello()

// dev only: ?page=about skips the preloader + intro and opens that page
if (import.meta.env.DEV) {
  const devPage = PAGES.findIndex((p) => p.id === new URLSearchParams(location.search).get('page'))
  if (devPage >= 0) whenFramesReady().then(() => jumpTo(devPage))
}
createRoot(document.getElementById('root')).render(<App />)
