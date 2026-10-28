import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
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
const MANIFEST_FILE = 'manifest.json'

const runLhciAutorun = () => {
  const lhci = createRequire(import.meta.url).resolve('@lhci/cli/src/cli.js')
  return (
    spawnSync(process.execPath, [lhci, 'autorun'], { stdio: 'inherit' })
      .status ?? FAILED
  )
}

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

const renameTo = (reportDir, from, filename) => {
  const to = join(reportDir, filename)
  if (from !== to) {
    renameSync(from, to)
  }
  return to
}

const readTargets = (targetsFile) => {
  if (!existsSync(targetsFile)) {
    throw new Error(
      'No Lighthouse targets found — run `npm run lighthouse` so the setup ' +
        'step can derive the URL list'
    )
  }
  return JSON.parse(readFileSync(targetsFile, 'utf8'))
}

const clearPreviousReports = (reportDir) => {
  if (!existsSync(reportDir)) {
    return
  }
  for (const file of readdirSync(reportDir)) {
    if (REPORT_FILE.test(file) || file === MANIFEST_FILE) {
      rmSync(join(reportDir, file))
    }
  }
}

const writeEmptyManifest = (reportDir) => {
  mkdirSync(reportDir, { recursive: true })
  writeFileSync(join(reportDir, MANIFEST_FILE), `${JSON.stringify([])}\n`)
}

const useStableReportNames = (reportDir, reports) => {
  const manifestPath = join(reportDir, MANIFEST_FILE)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  for (const entry of manifest) {
    const name = stableNameOf(reports, entry.url)
    entry.htmlPath = renameTo(reportDir, entry.htmlPath, `${name}.report.html`)
    entry.jsonPath = renameTo(reportDir, entry.jsonPath, `${name}.report.json`)
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
}

/**
 * Audits the URLs in the targets file and leaves one report per page under
 * route-derived names, with a manifest listing them. Clears the previous run's
 * reports first. With no URLs to audit it runs nothing and writes an empty
 * manifest.
 *
 * @param {object} options
 * @param {string} options.reportDir - directory the reports and manifest are written to
 * @param {string|URL} options.targetsFile - targets file listing the URLs and their report names
 * @param {() => number} options.runLighthouse - runs the audit, returning its exit status
 * @returns {number} the exit status
 */
export const runAudit = ({ reportDir, targetsFile, runLighthouse }) => {
  clearPreviousReports(reportDir)
  const { urls = [], reports = {} } = readTargets(targetsFile)
  if (urls.length === 0) {
    writeEmptyManifest(reportDir)
    process.stdout.write('Lighthouse audited no pages — no URLs to audit\n')
    return 0
  }
  const status = runLighthouse()
  if (existsSync(join(reportDir, MANIFEST_FILE))) {
    useStableReportNames(reportDir, reports)
  }
  return status
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(
    runAudit({
      reportDir: fileURLToPath(
        new URL('../../lighthouse-report/', import.meta.url)
      ),
      targetsFile: TARGETS_FILE,
      runLighthouse: runLhciAutorun
    })
  )
}
