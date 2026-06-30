import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The schema document accessor: loads the portable **draft-07 JSON Schema** and
 * resolves `$ref` nodes against `$defs`. Kept dependency-free on purpose — the
 * prototypes are throwaway and should not add a runtime dependency — but the
 * schema file is plain JSON Schema, so swapping in ajv (or Zod / Pydantic) is a
 * one-adapter change.
 */
const dirname = path.dirname(fileURLToPath(import.meta.url))
export const schema = JSON.parse(
  fs.readFileSync(
    path.join(dirname, '..', 'model', 'quote.schema.json'),
    'utf8'
  )
)

const DEFS_REF_PREFIX = '#/$defs/'

/**
 * Resolve a schema node, following a `$ref` into `$defs` when present.
 *
 * @param {object} node - A schema node, possibly a `{ $ref }` pointer.
 * @returns {object} The referenced `$defs` node, or the node unchanged.
 */
export const resolve = (node) => {
  if (!node?.$ref) {
    return node
  }
  return schema.$defs[node.$ref.replace(DEFS_REF_PREFIX, '')]
}
