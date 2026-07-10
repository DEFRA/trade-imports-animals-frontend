/**
 * i18n resolver — thin wrapper over a locales JSON tree.
 *
 * Every user-facing string in the spike is stored in `locales/en.json`
 * under a nested key path (dotted for consumers, e.g.
 * `flow.section.origin.title`). Callers pass the key to `t()`; a
 * translator working on Welsh support will add a sibling `cy.json` and
 * this file will thread locale through — see NEXT.md P0.5.
 *
 * Missing-key behaviour: `t()` returns the key itself as a plain
 * string. Rendered in the UI, `flow.section.origin.title` reads as an
 * obviously-wrong dotted path — a visible signal to the reviewer that
 * a translation is missing. The coverage test in
 * `i18n-coverage.test.js` is the harder gate; the visible dotted path
 * is a runtime safety net.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Load once at module init. `readFileSync` avoids the JSON import-
// attributes syntax that this repo's ESLint config doesn't yet parse.
const dirname = path.dirname(fileURLToPath(import.meta.url))
const en = JSON.parse(
  readFileSync(path.join(dirname, '..', 'locales', 'en.json'), 'utf-8')
)

/** Resolve a dotted key path against the loaded locale map. Returns
 *  the string at that path, or `undefined` if the path doesn't exist
 *  or points at a non-string. */
function lookup(key) {
  const parts = key.split('.')
  let cursor = en
  for (const part of parts) {
    if (cursor === null || typeof cursor !== 'object') return undefined
    cursor = cursor[part]
  }
  return typeof cursor === 'string' ? cursor : undefined
}

/** Translate a message key. Missing keys return the key itself as a
 *  visible fallback — the coverage test in i18n-coverage.test.js is
 *  the real safety net. When `params` is supplied, `{name}`
 *  placeholders in the template are substituted; unresolved
 *  placeholders render as `{name}` so the omission is visible. */
export function t(key, params) {
  if (key === null || key === undefined) return key
  const value = lookup(key)
  if (value === undefined) return key
  if (params) return interpolate(value, params)
  return value
}

function interpolate(template, params) {
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    params[name] !== undefined && params[name] !== null
      ? String(params[name])
      : `{${name}}`
  )
}

/** True iff a key resolves to a string in the current locale. Used by
 *  the coverage test to assert every key referenced from flow.js /
 *  presentation.js is present. */
export function hasKey(key) {
  return lookup(key) !== undefined
}
