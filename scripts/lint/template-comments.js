import { globSync, readFileSync } from 'node:fs'
import { findTrackingId } from './tracking-ids.js'

const NUNJUCKS_COMMENT = /\{#([\s\S]*?)#\}/g

const lineOf = (source, index) => source.slice(0, index).split('\n').length

/**
 * Lists every Nunjucks comment that carries a ticket key, backlog or ruling
 * id, release name or session word.
 *
 * @param {string[]} paths - the template files to read
 * @returns {string[]} one `path:line kind ("match")` entry per finding
 */
export const templateCommentFindings = (paths) =>
  paths.flatMap((path) => {
    const source = readFileSync(path, 'utf8')
    return [...source.matchAll(NUNJUCKS_COMMENT)].flatMap((comment) => {
      const found = findTrackingId(comment[1])
      return found
        ? [
            `${path}:${lineOf(source, comment.index)} ${found.kind} ("${found.match}")`
          ]
        : []
    })
  })

if (import.meta.main) {
  const findings = templateCommentFindings(globSync('src/**/*.njk'))
  for (const finding of findings) {
    process.stderr.write(`${finding}\n`)
  }
  process.exitCode = findings.length > 0 ? 1 : 0
}
