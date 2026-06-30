import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { humanize, isEmpty } from '../lib/fieldutil.js'

/**
 * A tiny, self-contained adapter over a **standard draft-07 JSON Schema**. The
 * schema is the portable model; this is one adapter that reads it. It is kept
 * dependency-free on purpose — the prototypes are throwaway and should not add a
 * runtime dependency — but the schema file is plain JSON Schema, so swapping in
 * ajv (or Zod / Pydantic) is a one-adapter change. Supports the subset the model
 * uses: type/enum/pattern/minLength, array+items+minItems, object+required,
 * $ref, and value-based if/then.
 */
const dirname = path.dirname(fileURLToPath(import.meta.url))
export const schema = JSON.parse(
  fs.readFileSync(
    path.join(dirname, '..', 'model', 'quote.schema.json'),
    'utf8'
  )
)

function resolve(node) {
  if (node?.$ref) {
    const key = node.$ref.replace('#/$defs/', '')
    return schema.$defs[key]
  }
  return node
}

/** Validate one already-present value against a schema node. Returns messages. */
export function validateValue(rawNode, value, label = 'value') {
  const node = resolve(rawNode)
  const errors = []
  if (node.enum && !node.enum.includes(value)) {
    errors.push(`Select a valid ${humanize(label).toLowerCase()}`)
  }
  if (node.type === 'string') {
    if (typeof value !== 'string') {
      errors.push(`${humanize(label)} is not valid`)
    } else {
      if (node.pattern && !new RegExp(node.pattern).test(value)) {
        errors.push(`Enter a valid ${humanize(label).toLowerCase()}`)
      }
      if (node.minLength !== undefined && value.length < node.minLength) {
        errors.push(`${humanize(label)} is required`)
      }
    }
  }
  if (node.type === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`${humanize(label)} is not valid`)
    } else {
      if (node.minItems !== undefined && value.length < node.minItems) {
        errors.push(`${humanize(label)} needs at least ${node.minItems}`)
      }
      if (node.items) {
        for (const item of value) {
          errors.push(...validateValue(node.items, item, label))
        }
      }
    }
  }
  if (node.type === 'object') {
    for (const req of node.required ?? []) {
      if (isEmpty(value?.[req])) {
        errors.push(`${humanize(req)} is required`)
      }
    }
    for (const [key, sub] of Object.entries(node.properties ?? {})) {
      if (value && !isEmpty(value[key])) {
        errors.push(...validateValue(sub, value[key], key))
      }
    }
  }
  return errors
}

/** Does an if-subschema's const conditions all hold against the answers? */
export function ifHolds(ifSchema, answers) {
  return Object.entries(ifSchema.properties ?? {}).every(
    ([field, sub]) => answers[field] === sub.const
  )
}

/** The provenance of an if-subschema — its `{ field, eq }` const conditions. */
export function ifProvenance(ifSchema) {
  return Object.entries(ifSchema.properties ?? {}).map(([field, sub]) => ({
    field,
    eq: sub.const
  }))
}

/** The currently-active if/then branches (their `if` holds). */
export const activeBranches = (answers) =>
  (schema.allOf ?? []).filter((branch) => ifHolds(branch.if, answers))

/**
 * Partial validation distinguishing **missing** (not answered) from **invalid**
 * (answered wrongly) — the heart of "status from a whole-object schema".
 */
export function check(answers) {
  const missing = []
  const invalid = []
  for (const key of schema.required) {
    if (isEmpty(answers[key])) {
      missing.push({ path: key, because: [] })
    }
  }
  for (const [key, node] of Object.entries(schema.properties)) {
    if (!isEmpty(answers[key])) {
      const errors = validateValue(node, answers[key], key)
      if (errors.length) {
        invalid.push({ path: key, message: errors[0] })
      }
    }
  }
  for (const branch of activeBranches(answers)) {
    for (const req of branch.then.required ?? []) {
      if (isEmpty(answers[req])) {
        missing.push({ path: req, because: ifProvenance(branch.if) })
      }
    }
    for (const [key, sub] of Object.entries(branch.then.properties ?? {})) {
      if (!isEmpty(answers[key])) {
        const merged = { ...resolve(schema.properties[key]), ...sub }
        const errors = validateValue(merged, answers[key], key)
        if (errors.length) {
          invalid.push({ path: key, message: errors[0] })
        }
      }
    }
  }
  return { missing, invalid }
}
