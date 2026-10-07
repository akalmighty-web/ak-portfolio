import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import seo from './scripts/prerender.js'

// seo(): page titles, link previews, structured data, a static HTML page per
// route, sitemap.xml and robots.txt, all for SITE_URL in src/config.js.
export default defineConfig({
  plugins: [react(), seo()],
  server: { port: 5173 },
})
