# How to update the portfolio

The site lives on GitHub (`ak-portfolio`) and Vercel publishes it. Every time you
**push** a change to GitHub, Vercel rebuilds and updates the live site by itself
(about a minute). Large originals (videos, full-size images, source art) stay on
your computer only; the site uses the optimised copies the scripts make.

You run the commands below in a terminal opened in the project folder
(in VS Code: **Terminal → New Terminal**).

---

## Add a new project

1. **Make a folder** for it inside the right category in `Projects/`:

   ```
   Projects/Concept art/My New Project/
   Projects/Game art/My New Project/
   Projects/Graphics art and AI/My New Project/
   ```

   The folder name is the name shown on the site.

2. **Put the files in it:**
   - `thumbnail.png`: the image on the cartridge (wide art, about 2.2 : 1).
   - The images / GIFs / videos for the project page. They appear **in filename
     order**, so name them `01.png`, `02.png`, `03.gif`, … to set the order.
   - A file called `cover.*` is skipped (on Behance a cover is only the grid image).

3. **Optional extras** (Behance link, a description, a YouTube video, or the
   position among the other projects): open `scripts/projects.config.json` and
   add an entry like the others, for example:

   ```json
   "My New Project": {
     "behance": "https://www.behance.net/gallery/...",
     "description": "One or two lines about the project.",
     "order": ["01.png", { "youtube": "VIDEO_ID" }, "02.png"]
   }
   ```

   To place it among the other cartridges, add the folder name to that category's
   list under `"projectOrder"`.

4. **Process the project** (makes web-ready images and videos):

   ```
   python scripts/build_projects.py
   ```

5. **Check it locally** (optional):

   ```
   npm run dev
   ```

   Open http://localhost:5173, go to Projects and open the new cartridge.
   Press `Ctrl + C` in the terminal to stop.

6. **Publish** (see "Publish an update" below).

Every category automatically ends with the "Coming soon" cartridge.

---

## Change other things

| What | Where |
| --- | --- |
| Email, CV link, social links | `src/config.js` (top of the file) |
| Home stats (3+ / 6+ / 2+) | `STATS` in `src/config.js` |
| "Worked with" logos and award laurels | add the PNG to `assets/worked with/` or `assets/Awards/`, run `python scripts/build_band.py`, add a line to `BAND` in `src/config.js` |
| The CV | replace `public/cv/Ananthkrishnan-CV-2026.pdf` (keep the same name) |
| About text | `src/pages/About.jsx` |
| Link-preview image | `python scripts/build_social.py` (makes `public/og-image.jpg`) |
| Re-rendered scroll animation | `npm run frames`, then raise `version` in `FRAMES` in `src/config.js` by 1 (so returning visitors get the new frames) |
| Re-rendered phone (portrait) animation | `npm run frames:portrait` (makes `public/frames-portrait/`), then raise `version` in `FRAMES_PORTRAIT` in `src/config.js` by 1 |
| Phone background | replace `assets/Website Background portrait.png`, then `npm run bg:portrait` |
| Phone layout (portrait) | `src/styles/portrait.css`; how the character is framed on each page: `FRAMING_PORTRAIT` in `src/config.js` |

---

## Publish an update

1. **Build test** (catches mistakes before they go live):

   ```
   npm run build
   ```

   It should end with `✓ built in …`.

2. **Save and upload** your changes:

   ```
   git add -A
   git commit -m "Add My New Project"
   git push
   ```

   Write a short description of what changed between the quotes.

3. **Wait about a minute.** Vercel rebuilds the site; refresh the live site to
   see the change. You can watch it on vercel.com → your project → **Deployments**.

If something looks wrong after publishing, open Vercel → **Deployments**, pick the
previous one and choose **Promote to Production** to go back instantly.

---

## Address and search engines

- The site's address is `SITE_URL` in `src/config.js`. If the domain ever
  changes, change it there only: link previews, canonical links, the sitemap and
  the structured data all follow.
- Every project gets its own page at `/projects/<name>` automatically, with its
  own title, description and preview image, and is added to `sitemap.xml` at
  the next build. Titles, descriptions and alt texts are written in `src/seo.js`.
- Google Search Console verification tag: paste it in `index.html` where the
  comment says so (near the top of `<head>`), then publish.

---

## Good to know

- **Never upload originals:** `.gitignore` already keeps `Animations/`, `Projects/`,
  `assets/`, `Fonts/`, `CV/`, screenshots and notes off GitHub. Only the
  optimised files in `public/` and the code are uploaded.
- **No file may be over 100 MB** on GitHub. The scripts keep files small; if a
  big video is ever needed, upload it to YouTube and add it as a `{ "youtube": … }` entry.
- **Your full local history** (before launch) is kept on this computer in the
  branch `pre-launch-history`; it is never uploaded.
