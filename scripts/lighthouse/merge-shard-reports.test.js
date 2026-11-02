import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { mergeShardReports } from './merge-shard-reports.js'

const writeShard = (shardsDir, shardName, pages) => {
  const dir = join(shardsDir, shardName)
  mkdirSync(dir, { recursive: true })
  const manifest = pages.map((page) => {
    writeFileSync(join(dir, `${page}.report.html`), `<html>${page}</html>`)
    writeFileSync(join(dir, `${page}.report.json`), `{"page":"${page}"}`)
    return {
      url: `http://localhost:3003/${page}`,
      isRepresentativeRun: true,
      htmlPath: `/runner/${shardName}/${page}.report.html`,
      jsonPath: `/runner/${shardName}/${page}.report.json`
    }
  })
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest))
}

describe('#mergeShardReports', () => {
  let root
  let shardsDir
  let reportDir

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'lighthouse-merge-'))
    shardsDir = join(root, 'shards')
    reportDir = join(root, 'report')
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('lists every shard page in shard order, pointing at the merged copies', () => {
    writeShard(shardsDir, 'lighthouse-report-2', ['origin'])
    writeShard(shardsDir, 'lighthouse-report-10', ['delete'])
    writeShard(shardsDir, 'lighthouse-report-1', ['home', 'hub'])

    mergeShardReports(shardsDir, reportDir)

    const manifest = JSON.parse(
      readFileSync(join(reportDir, 'manifest.json'), 'utf8')
    )
    expect(manifest.map(({ url }) => url)).toEqual([
      'http://localhost:3003/home',
      'http://localhost:3003/hub',
      'http://localhost:3003/origin',
      'http://localhost:3003/delete'
    ])
    expect(manifest[2]).toMatchObject({
      htmlPath: resolve(reportDir, 'origin.report.html'),
      jsonPath: resolve(reportDir, 'origin.report.json')
    })
    expect(readFileSync(manifest[2].jsonPath, 'utf8')).toBe('{"page":"origin"}')
  })

  it('skips a shard that produced no manifest', () => {
    writeShard(shardsDir, 'lighthouse-report-1', ['home'])
    mkdirSync(join(shardsDir, 'lighthouse-report-2'))

    expect(
      mergeShardReports(shardsDir, reportDir).map(({ url }) => url)
    ).toEqual(['http://localhost:3003/home'])
  })

  it('merges a lone shard whose reports sit directly in the shards directory', () => {
    writeShard(root, 'shards', ['home', 'hub'])

    mergeShardReports(shardsDir, reportDir)

    const manifest = JSON.parse(
      readFileSync(join(reportDir, 'manifest.json'), 'utf8')
    )
    expect(manifest.map(({ url }) => url)).toEqual([
      'http://localhost:3003/home',
      'http://localhost:3003/hub'
    ])
    expect(readFileSync(manifest[1].jsonPath, 'utf8')).toBe('{"page":"hub"}')
  })

  it('writes no manifest when no shard produced one', () => {
    expect(mergeShardReports(shardsDir, reportDir)).toEqual([])
    expect(existsSync(join(reportDir, 'manifest.json'))).toBe(false)
  })
})
