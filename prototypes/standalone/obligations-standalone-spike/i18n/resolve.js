import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Graft 7 — the throwing reason-code resolver. Dotted, locale-agnostic
 * codes (authored by engine/reasons.js and validation/) plus interpolation
 * values resolve to English copy from model/messages.en.json. Unknown codes
 * and unresolved {placeholder} tokens THROW, so a raw code can never reach
 * the DOM — the rank-14 no-leaked-codes edge as a build-time guarantee.
 */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const catalogue = JSON.parse(
  fs.readFileSync(path.join(dirname, '..', 'model', 'messages.en.json'), 'utf8')
).messages

const TOKEN = /\{([a-zA-Z]+)\}/g

/** Build a resolver over any message catalogue (fixtures, future Welsh). */
export const createResolver = (messages) => {
  return (code, values = {}) => {
    const template = messages[code]
    if (template === undefined) {
      throw new Error(`Unknown message code "${code}"`)
    }
    return template.replace(TOKEN, (match, token) => {
      const value = values[token]
      if (value === undefined || value === null) {
        throw new Error(`Unresolved placeholder "{${token}}" in "${code}"`)
      }
      return String(value)
    })
  }
}

/** The journey resolver, bound to the English catalogue. */
export const resolveMessage = createResolver(catalogue)

/** Resolve one reason record ({ code, values? }) to UI copy. */
export const resolveReason = ({ code, values }) => resolveMessage(code, values)
