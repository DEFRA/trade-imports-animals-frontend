import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { mergeShardReports } from './merge-shard-reports.js'
import { runAudit } from './run-audit.js'

const LIGHTHOUSE_FAILED = 1
const PAGE_URL = 'http://localhost:3003/notifications/abc123/origin'

const lighthouseWritingOneReport = (reportDir) => () => {
  mkdirSync(reportDir, { recursive: true })
  const htmlPath = join(reportDir, 'localhost-abc123.report.html')
  const jsonPath = join(reportDir, 'localhost-abc123.report.json')
  writeFileSync(htmlPath, '<html></html>')
  writeFileSync(jsonPath, '{}')
  writeFileSync(
    join(reportDir, 'manifest.json'),
    JSON.stringify([
      { url: PAGE_URL, isRepresentativeRun: true, htmlPath, jsonPath }
    ])
  )
  return 0
}

describe('#runAudit', () => {
  let root
  let reportDir
  let targetsFile

  const writeTargets = (targets) =>
    writeFileSync(targetsFile, JSON.stringify(targets))

  const readManifest = (dir) =>
    JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'lighthouse-run-'))
    reportDir = join(root, 'lighthouse-report')
    targetsFile = join(root, 'targets.json')
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('succeeds without running Lighthouse and writes an empty manifest when there are no URLs', () => {
    writeTargets({ urls: [], reports: {} })

    const status = runAudit({
      reportDir,
      targetsFile,
      runLighthouse: () => LIGHTHOUSE_FAILED
    })

    expect(status).toBe(0)
    expect(readManifest(reportDir)).toEqual([])
  })

  it('writes an empty manifest the shard merge accepts as a shard with no pages', () => {
    writeTargets({ urls: [] })
    const shardsDir = join(root, 'shards')
    runAudit({
      reportDir: join(shardsDir, 'lighthouse-report-shard-2'),
      targetsFile,
      runLighthouse: () => LIGHTHOUSE_FAILED
    })
    const mergedDir = join(root, 'merged')

    expect(mergeShardReports(shardsDir, mergedDir)).toEqual([])
    expect(readManifest(mergedDir)).toEqual([])
  })

  it('renames each report to its route name and returns the Lighthouse status', () => {
    writeTargets({ urls: [PAGE_URL], reports: { [PAGE_URL]: 'origin' } })

    const status = runAudit({
      reportDir,
      targetsFile,
      runLighthouse: lighthouseWritingOneReport(reportDir)
    })

    expect(status).toBe(0)
    expect(readManifest(reportDir)).toEqual([
      {
        url: PAGE_URL,
        isRepresentativeRun: true,
        htmlPath: join(reportDir, 'origin.report.html'),
        jsonPath: join(reportDir, 'origin.report.json')
      }
    ])
    expect(existsSync(join(reportDir, 'origin.report.html'))).toBe(true)
  })

  it('refuses to run when there is no targets file', () => {
    expect(() =>
      runAudit({ reportDir, targetsFile, runLighthouse: () => 0 })
    ).toThrow('No Lighthouse targets found')
  })
})
