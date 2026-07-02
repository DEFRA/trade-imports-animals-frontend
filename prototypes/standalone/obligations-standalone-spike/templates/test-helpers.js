import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import nunjucks from 'nunjucks'

/**
 * Template-test rendering seam: a nunjucks Environment mirroring the
 * roots and options of src/config/nunjucks/nunjucks.js (govuk-frontend
 * dist + the prototypes tree) so these tests render the exact markup
 * the app serves. `getAssetPath` is the one app global the layout
 * calls; a stub keeps the mirrored environment self-contained.
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(dirname, '..', '..', '..', '..')

export const TEMPLATES = 'standalone/obligations-standalone-spike/templates'

const environment = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([
    path.join(repoRoot, 'node_modules', 'govuk-frontend', 'dist'),
    path.join(repoRoot, 'prototypes')
  ]),
  { autoescape: true, trimBlocks: true, lstripBlocks: true }
)
environment.addGlobal('getAssetPath', (asset) => `/public/${asset}`)

/** Render one spike template with the layout wired as the routes do. */
export const render = (name, context = {}) =>
  environment.render(`${TEMPLATES}/${name}`, {
    layout: `${TEMPLATES}/layout.njk`,
    ...context
  })

/** Render an inline source (for exercising macros like fields.njk). */
export const renderString = (source, context = {}) =>
  environment.renderString(source, context)

/** The real polished Flow — the tests' source of pinned copy. */
export const loadFlow = () =>
  JSON.parse(
    fs.readFileSync(path.join(dirname, '..', 'model', 'flow.json'), 'utf8')
  )
