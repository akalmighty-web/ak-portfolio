// Project data is generated from the Projects/ folder:
//
//   python scripts/build_projects.py
//
// Add a project by adding a folder Projects/<Category>/<Project name>/ with a
// thumbnail.png and the images / GIFs / videos for its page (shown in filename
// order; prefix the folder name with "01 " etc. to set the cartridge order).
// Optional ordering, skipped files, YouTube embeds and Behance links live in
// scripts/projects.config.json. Then re-run the script.
import generated from './projects.generated.json'

export const CATEGORIES = [
  { id: 'game-art', label: 'Game Art' },
  { id: 'concept-art', label: 'Concept Art' },
  { id: 'graphics-ai', label: 'Graphics & AI' },
]

export const DEFAULT_CATEGORY = 'concept-art'

export const PROJECTS = generated.projects

export const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label ?? id
