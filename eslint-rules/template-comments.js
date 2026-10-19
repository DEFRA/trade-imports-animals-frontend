import { globSync, readFileSync } from 'node:fs'
import { findTrackingReference } from './code-quality.js'

const NUNJUCKS_COMMENT = /\{#([\s\S]*?)#\}/g

const lineOf = (source, index) => source.slice(0, index).split('\n').length

export const templateCommentFindings = (paths) =>
  paths.flatMap((path) => {
    const source = readFileSync(path, 'utf8')
    return [...source.matchAll(NUNJUCKS_COMMENT)].flatMap((comment) => {
      const found = findTrackingReference(comment[1])
      return found
        ? [
            `${path}:${lineOf(source, comment.index)} ${found.label} ("${found.match}")`
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
