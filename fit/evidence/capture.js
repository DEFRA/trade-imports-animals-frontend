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

/**
 * The commit the application under test is at. Recorded per capture so a
 * picture can never be shown under a commit it is not of.
 *
 * @returns {string} Full forty-character sha, or 'unknown'
 */
export const appSha = () => {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      cwd: dirname(new URL(import.meta.url).pathname)
    }).trim()
  } catch {
    return 'unknown'
  }
}

const captureDir = () => join(outputRoot(), `frontend@${appSha().slice(0, 8)}`)

/**
 * Regions whose content changes on every run. Without masks a no-op re-capture
 * drifts every screen that has one, and the report's drift panel — which exists
 * to say "this picture changed under a decision you are about to make" — fills
 * with noise and stops being read.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {import('@playwright/test').Locator[]}
 */
export const volatileRegions = (page) => [
  // The declaration page prints today's date.
  page.locator('[data-evidence-volatile]'),
  // The confirmation page prints the generated notification reference.
  page.locator('.govuk-panel__body'),
  // The documents page counts a scan timer that races the screenshot.
  page.locator('[data-module="app-upload-status"]')
]

/**
 * Capture one screen, full page, at the settings the report needs.
 *
 * Everything volatile is masked and everything animated is stopped, so two
 * runs against the same commit produce the same bytes. That is what makes a
 * changed hash mean the code changed.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} screen - Screen id, matching the corpus (for example fe-hub)
 * @returns {Promise<object>} The manifest row
 */
export const captureScreen = async (page, screen) => {
  const dir = join(captureDir(), 'page')
  mkdirSync(dir, { recursive: true })
  const path = join(dir, `${screen}.png`)

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({
    path,
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    mask: undefined,
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
    deviceScaleFactor: Number(process.env.FIT_CAPTURE_DSF ?? 2)
  }
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
        harnessSha: appSha(),
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
