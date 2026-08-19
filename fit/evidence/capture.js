import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

/**
 * Where the evidence lands. A findings report in another repo consumes it, so
 * the destination is an input rather than a constant — but it has a default,
 * because a capture run that silently wrote nowhere would be worse than one
 * that refused.
 */
export const outputRoot = () =>
  process.env.FIT_CAPTURE_DIR ??
  join(
    process.env.HOME,
    'git/defra/trade-imports-workspace/workareas/shared/dr21-parity/evidence'
  )

// An empty answer is treated as no answer. `git log` exits zero and prints
// nothing when a pathspec matches no commit, and a blank sha would name the
// capture directory `frontend@` without anything failing.
const git = (args) => {
  try {
    return (
      execFileSync('git', args, {
        encoding: 'utf8',
        cwd: dirname(new URL(import.meta.url).pathname)
      }).trim() || 'unknown'
    )
  } catch {
    return 'unknown'
  }
}

/**
 * The commit the application under test is at. Recorded per capture so a
 * picture can never be shown under a commit it is not of.
 *
 * This is the last commit that touched `src`, not HEAD. The capture directory
 * is named after it, so naming it after HEAD would orphan every picture each
 * time this harness itself was edited — and the pixels would be identical.
 * A harness change that does move a pixel shows up where it should: as drift
 * on the file, which the report already reads.
 *
 * @returns {string} Full forty-character sha, or 'unknown'
 */
export const appSha = () => git(['log', '-1', '--format=%H', '--', ':/src'])

/**
 * The commit the capture code itself is at.
 *
 * @returns {string} Full forty-character sha, or 'unknown'
 */
export const harnessSha = () => git(['rev-parse', 'HEAD'])

const captureDir = () => join(outputRoot(), `frontend@${appSha().slice(0, 8)}`)

/**
 * Capture one screen, full page, at the settings the report needs.
 *
 * Motion is stopped and the caret is hidden, so two runs against the same
 * commit produce the same bytes. That is what makes a changed hash mean the
 * code changed rather than the clock ticking.
 *
 * Three regions are still volatile and are not masked yet: the declaration
 * page's date, the confirmation page's generated reference, and the documents
 * scan timer. Their screens will report drift on every rebuild until they are.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} screen - Screen id, matching the corpus (for example fe-hub)
 * @param {object[]} [anchors] - Overrides the anchors declared for this screen
 * @returns {Promise<object>} The manifest row
 */
export const captureScreen = async (page, screen, anchors) => {
  const dir = join(captureDir(), 'page')
  mkdirSync(dir, { recursive: true })
  const path = join(dir, `${screen}.png`)

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({
    path,
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    scale: 'device'
  })

  const bytes = readFileSync(path)
  return {
    screen,
    file: `page/${screen}.png`,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    url: new URL(page.url()).pathname,
    title: await page.title(),
    deviceScaleFactor: Number(process.env.FIT_CAPTURE_DSF ?? 2),
    crops: await captureAnchors(page, screen, anchors ?? loadAnchors()[screen])
  }
}

/**
 * Ancestors worth cropping to, nearest first.
 *
 * A crop of the bare input is not evidence — the label, the hint and the error
 * are the finding. Walking up to the form group gets all of it, and the wider
 * containers catch a control that sits outside one.
 */
const CROP_ANCESTORS = [
  '.govuk-form-group',
  'fieldset',
  '.govuk-radios',
  '.govuk-checkboxes',
  '.govuk-summary-list__row',
  '.govuk-task-list__item',
  '.govuk-details',
  '.govuk-inset-text',
  '.govuk-notification-banner',
  '.govuk-error-summary'
]

const CROP_PADDING = 24

/**
 * Resolve one anchor descriptor to exactly one element, or refuse.
 *
 * The ladder asserts exactly one match. Zero or many is a typed error the
 * report renders as an evidence-broken card, which is information — where a
 * raw CSS string re-run against moved markup matches the wrong node silently.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} anchor
 * @returns {import('@playwright/test').Locator|null}
 */
export const resolveAnchor = (page, anchor) => {
  if (anchor.kind === 'field') {
    return page.locator(
      `[name="${anchor.name}"], [name^="${anchor.name}-"], [name^="${anchor.name}["]`
    )
  }
  if (anchor.kind === 'label') {
    return page.getByLabel(anchor.text, { exact: false })
  }
  return null
}

/**
 * Crop the region around one anchor.
 *
 * Clipped in document coordinates rather than shot with locator.screenshot, so
 * neighbours bleed in at the edges and the fragment reads as a place on a page
 * rather than as a floating control.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} screen
 * @param {object} anchor
 * @returns {Promise<object|null>} The manifest row, or null with a reason
 */
export const captureAnchor = async (page, screen, anchor) => {
  const locator = resolveAnchor(page, anchor)
  if (!locator) {
    return { anchor: anchor.key, why: `Unknown anchor kind "${anchor.kind}".` }
  }
  const count = await locator.count()
  if (count === 0) {
    return { anchor: anchor.key, why: 'No element matched this anchor.' }
  }

  // Document coordinates, clamped to the document, because the clip is applied
  // to the full-page image rather than to the viewport.
  const box = await locator.first().evaluate(
    (element, { ancestors, padding }) => {
      const container =
        ancestors.map((selector) => element.closest(selector)).find(Boolean) ??
        element
      const rect = container.getBoundingClientRect()
      const pageWidth = document.documentElement.scrollWidth
      const pageHeight = document.documentElement.scrollHeight
      const x = Math.max(0, rect.left + window.scrollX - padding)
      const y = Math.max(0, rect.top + window.scrollY - padding)
      return {
        x,
        y,
        width: Math.min(rect.width + padding * 2, pageWidth - x),
        height: Math.min(rect.height + padding * 2, pageHeight - y)
      }
    },
    { ancestors: CROP_ANCESTORS, padding: CROP_PADDING }
  )
  if (box.width < 8 || box.height < 8) {
    return {
      anchor: anchor.key,
      why: 'The resolved element has no visible box.'
    }
  }

  const dir = join(captureDir(), 'crop')
  mkdirSync(dir, { recursive: true })
  const file = `${screen}__${anchor.key}.png`
  await page.screenshot({
    path: join(dir, file),
    fullPage: true,
    clip: box,
    animations: 'disabled',
    caret: 'hide',
    scale: 'device'
  })

  const bytes = readFileSync(join(dir, file))
  return {
    anchor: anchor.key,
    kind: anchor.kind,
    file: `crop/${file}`,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    matched: count,
    why: anchor.why ?? null
  }
}

/**
 * Every anchor declared for one screen, shot.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} screen
 * @param {object[]} anchors
 * @returns {Promise<object[]>}
 */
export const captureAnchors = async (page, screen, anchors = []) => {
  const out = []
  for (const anchor of anchors) {
    out.push(await captureAnchor(page, screen, anchor))
  }
  return out
}

/**
 * Load the anchors declared for this side, if any.
 *
 * @returns {Record<string, object[]>}
 */
export const loadAnchors = () => {
  const path = join(outputRoot(), 'anchors.frontend.json')
  if (!existsSync(path)) return {}
  return JSON.parse(readFileSync(path, 'utf8')).screens ?? {}
}

/**
 * Write the manifest.
 *
 * The manifest is the only index. The report never globs the filesystem and
 * never builds a path by convention, so a frame present in the backlog but
 * absent here renders as a stated gap rather than as a broken image.
 *
 * @param {object[]} rows
 * @returns {string} Path written
 */
export const writeManifest = (rows) => {
  const dir = captureDir()
  mkdirSync(dir, { recursive: true })
  const path = join(dir, 'manifest.json')

  // A run that captured a subset must not erase what an earlier run captured.
  const existing = existsSync(path)
    ? JSON.parse(readFileSync(path, 'utf8'))
    : { rows: [] }
  const byScreen = new Map(existing.rows.map((row) => [row.screen, row]))
  for (const row of rows) byScreen.set(row.screen, row)

  writeFileSync(
    path,
    `${JSON.stringify(
      {
        side: 'frontend',
        appSha: appSha(),
        harnessSha: harnessSha(),
        capturedOn: new Date().toISOString(),
        viewport: { width: 1280, height: 1200 },
        deviceScaleFactor: Number(process.env.FIT_CAPTURE_DSF ?? 2),
        rows: [...byScreen.values()].sort((a, b) =>
          a.screen.localeCompare(b.screen)
        )
      },
      null,
      2
    )}\n`,
    'utf8'
  )
  return path
}
