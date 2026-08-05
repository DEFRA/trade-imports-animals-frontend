import { spawnSync } from 'node:child_process'
import {
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { TARGETS_FILE } from './audit-targets.js'

const FAILED = 1
const REPORT_FILE = /\.report\.(html|json)$/
const REPORT_DIR = fileURLToPath(
  new URL('../../lighthouse-report/', import.meta.url)
)
const MANIFEST_FILE = 'manifest.json'
const MANIFEST = join(REPORT_DIR, MANIFEST_FILE)

const lhci = createRequire(import.meta.url).resolve('@lhci/cli/src/cli.js')

const runLighthouse = () =>
  spawnSync(process.execPath, [lhci, 'autorun'], { stdio: 'inherit' }).status ??
  FAILED

const stableNameOf = (reports, url) => {
  const name = reports[url]
  if (!name) {
    throw new Error(
      `Lighthouse reported on ${url}, which the targets file gives no report name — ` +
        'run `npm run lighthouse` so the setup step writes both'
    )
  }
  return name
}

const renameTo = (from, filename) => {
  const to = join(REPORT_DIR, filename)
  if (from !== to) {
    renameSync(from, to)
  }
  return to
}

/** Drops the previous run's reports, so everything left afterwards is what this
 * run produced and a stale manifest cannot be mistaken for a fresh one. */
const clearPreviousReports = () => {
  if (!existsSync(REPORT_DIR)) {
    return
  }
  for (const file of readdirSync(REPORT_DIR)) {
    if (REPORT_FILE.test(file) || file === MANIFEST_FILE) {
      rmSync(join(REPORT_DIR, file))
    }
  }
}

/** LHCI names each report after the URL's pathname, which carries the seeded
 * journey id and so changes every run. Renaming to the route's own name — and
 * rewriting the manifest the publish steps read — keeps one report per page
 * however many times the audit runs. */
const useStableReportNames = () => {
  const { reports = {} } = JSON.parse(readFileSync(TARGETS_FILE, 'utf8'))
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
  for (const entry of manifest) {
    const name = stableNameOf(reports, entry.url)
    entry.htmlPath = renameTo(entry.htmlPath, `${name}.report.html`)
    entry.jsonPath = renameTo(entry.jsonPath, `${name}.report.json`)
  }
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2))
}

clearPreviousReports()
const status = runLighthouse()
if (existsSync(MANIFEST)) {
  useStableReportNames()
}
process.exit(status)
