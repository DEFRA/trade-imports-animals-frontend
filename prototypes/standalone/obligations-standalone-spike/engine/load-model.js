import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createIdentifierIndex } from './identifiers.js'

/**
 * Parse-and-validate the obligations catalogue once at plugin registration.
 * Flow-ignorant — the evaluator's model is the Service-level catalogue
 * only. Enforces the record-purity guard (obligations.md:196 — no scoping,
 * mandate or presentation keys), the indexedBy taxonomy (`seeded` is a
 * validated schema value even though this journey never uses it), the
 * type-companion convention and, when given a scope registry, that every
 * registered rule targets a real obligation.
 */

/**
 * Every `type` in use must have a companion here — the open type space is
 * extended by adding a row, and lib/fields dispatches widgets off the kind.
 */
export const typeCompanions = Object.freeze({
  boolean: { kind: 'choice' },
  currency: { kind: 'input' },
  date: { kind: 'block' },
  email: { kind: 'input' },
  file: { kind: 'block' },
  formatted: { kind: 'input' },
  'multi-select': { kind: 'choice' },
  number: { kind: 'input' },
  quote: { kind: 'system' },
  radio: { kind: 'choice' },
  select: { kind: 'choice' },
  tel: { kind: 'input' },
  text: { kind: 'input' },
  textarea: { kind: 'block' }
})

const ALLOWED_KEYS = new Set([
  '$comment',
  'id',
  'name',
  'type',
  'cardinality',
  'indexedBy',
  'constraints',
  'options',
  'handler'
])

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const NAME = /^[a-z][a-zA-Z0-9]*$/
const SOURCES = ['user', 'derived', 'seeded']
const MUTABILITIES = ['edit-only', 'edit-add-remove']
const CARDINALITY_SINGLE = 'single'
const CARDINALITY_INDEXED = 'indexed'

const fail = (record, message) => {
  throw new Error(`Obligation "${record.name ?? record.id}": ${message}`)
}

const validateRecord = (record) => {
  const forbiddenKey = Object.keys(record).find((key) => !ALLOWED_KEYS.has(key))
  if (forbiddenKey) {
    fail(record, `carries forbidden key "${forbiddenKey}" (obligations.md:196)`)
  }
  if (!UUID.test(record.id ?? '')) {
    fail(record, 'id must be a committed UUID')
  }
  if (!NAME.test(record.name ?? '')) {
    fail(record, 'name must be code-shaped (camelCase)')
  }
  if (!typeCompanions[record.type]) {
    fail(record, `type "${record.type}" has no companion in the type registry`)
  }
  if (record.cardinality === CARDINALITY_SINGLE) {
    if (record.indexedBy) {
      fail(record, 'single cardinality must not carry indexedBy')
    }
  } else if (record.cardinality === CARDINALITY_INDEXED) {
    validateIndexedBy(record)
  } else {
    fail(record, `unknown cardinality "${record.cardinality}"`)
  }
}

const validateIndexedBy = (record) => {
  const { source, mutability } = record.indexedBy ?? {}
  if (!SOURCES.includes(source)) {
    fail(record, `unknown indexedBy source "${source}"`)
  }
  if (!MUTABILITIES.includes(mutability)) {
    fail(record, `unknown indexedBy mutability "${mutability}"`)
  }
}

const validateDerivedReferences = (record, identifiers) => {
  const { controllingObligation, controllingValue } = record.indexedBy
  if (!identifiers.hasId(controllingObligation)) {
    fail(record, `controllingObligation "${controllingObligation}" is unknown`)
  }
  const controller = identifiers.recordOfId(controllingObligation)
  if (!controller.options?.includes(controllingValue)) {
    fail(
      record,
      `controllingValue "${controllingValue}" is not an option of "${controller.name}"`
    )
  }
}

/** Validate a parsed catalogue; returns `{ obligations, identifiers }`. */
export const loadModel = (rawJson, { scopeRegistry } = {}) => {
  const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson
  const obligations = parsed?.obligations
  if (!Array.isArray(obligations) || obligations.length === 0) {
    throw new Error(
      'Obligations model must carry a non-empty obligations array'
    )
  }
  for (const record of obligations) {
    validateRecord(record)
  }
  const identifiers = createIdentifierIndex(obligations)
  for (const record of obligations) {
    if (record.indexedBy?.source === 'derived') {
      validateDerivedReferences(record, identifiers)
    }
  }
  scopeRegistry?.assertCoverage(identifiers.names())
  return { obligations, identifiers }
}

const dirname = path.dirname(fileURLToPath(import.meta.url))
const modelPath = path.join(dirname, '..', 'model', 'obligations.json')
let cachedJson

/** Load and validate the real model/obligations.json (read once). */
export const loadJourneyModel = (options) => {
  cachedJson ??= fs.readFileSync(modelPath, 'utf8')
  return loadModel(cachedJson, options)
}
