import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs'
import { basename, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const MANIFEST_FILE = 'manifest.json'

const copyReport = (shardDir, reportPath, reportDir) => {
  const to = resolve(reportDir, basename(reportPath))
  copyFileSync(join(shardDir, basename(reportPath)), to)
  return to
}

const shardEntries = (shardDir, reportDir) =>
  JSON.parse(readFileSync(join(shardDir, MANIFEST_FILE), 'utf8')).map(
    (entry) => ({
      ...entry,
      htmlPath: copyReport(shardDir, entry.htmlPath, reportDir),
      jsonPath: copyReport(shardDir, entry.jsonPath, reportDir)
    })
  )

const shardDirsWithManifest = (shardsDir) =>
  existsSync(shardsDir)
    ? readdirSync(shardsDir)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map((name) => join(shardsDir, name))
        .filter((dir) => existsSync(join(dir, MANIFEST_FILE)))
    : []

/**
 * Copies every shard's Lighthouse reports into one report directory and writes
 * one manifest listing them all, shard by shard, pointing at the copies.
 * Writes nothing when no shard produced a manifest.
 *
 * @param {string} shardsDir - directory holding one subdirectory per shard
 * @param {string} reportDir - directory the merged reports are written to
 * @returns {object[]} the merged manifest entries
 */
export const mergeShardReports = (shardsDir, reportDir) => {
  const shardDirs = shardDirsWithManifest(shardsDir)
  if (shardDirs.length === 0) {
    return []
  }
  mkdirSync(reportDir, { recursive: true })
  const manifest = shardDirs.flatMap((dir) => shardEntries(dir, reportDir))
  writeFileSync(
    join(reportDir, MANIFEST_FILE),
    JSON.stringify(manifest, null, 2)
  )
  return manifest
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [shardsDir, reportDir] = process.argv.slice(2)
  const manifest = mergeShardReports(shardsDir, reportDir)
  process.stdout.write(
    `Merged ${manifest.length} Lighthouse page reports into ${reportDir}\n`
  )
}
