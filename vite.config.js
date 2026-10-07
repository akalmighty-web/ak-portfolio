import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The site's public address, for the link-preview tags in index.html (social
// sites need absolute URLs). On Vercel it is filled in automatically from the
// production domain; set SITE_URL to override (e.g. SITE_URL=https://example.com).
const site = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
).replace(/\/$/, '')

export default defineConfig({
  plugins: [react(), { name: 'site-url', transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', site) }],
  server: { port: 5173 },
})
