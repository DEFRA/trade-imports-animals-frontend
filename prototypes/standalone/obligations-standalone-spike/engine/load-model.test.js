import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { loadModel, loadJourneyModel, typeCompanions } from './load-model.js'
import { journeyScopeRegistry } from './scope/journey-rules.js'

// Committed catalogue ids resolved by obligation name, read straight
// from model/obligations.json (not through the loader under test) so
// the fixtures never hardcode UUIDs.
const catalogue = JSON.parse(
  fs.readFileSync(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      'model',
      'obligations.json'
    ),
    'utf8'
  )
)
const idOf = (name) => {
  const entry = catalogue.obligations.find((record) => record.name === name)
  if (!entry) {
    throw new Error(`No catalogue obligation named "${name}"`)
  }
  return entry.id
}

/** A minimal valid fixture record to mutate per test. */
const record = (overrides = {}) => ({
  id: idOf('email'),
  name: 'email',
  type: 'email',
  cardinality: 'single',
  ...overrides
})

const model = (...obligations) => ({ obligations })

describe('engine/load-model — the REAL catalogue + journey registry (integration)', () => {
  it('loads model/obligations.json against the journey scope registry', () => {
    const { obligations, identifiers } = loadJourneyModel({
      scopeRegistry: journeyScopeRegistry
    })
    expect(obligations).toHaveLength(30)
    expect(identifiers.size).toBe(30)
    expect(identifiers.hasName('fullName')).toBe(true)
  })

  it('has a type companion for every type the real model uses', () => {
    const { obligations } = loadJourneyModel()
    for (const { type } of obligations) {
      expect(typeCompanions[type], `type "${type}"`).toBeDefined()
      expect(['input', 'block', 'choice', 'system']).toContain(
        typeCompanions[type].kind
      )
    }
    expect(typeCompanions.quote.kind).toBe('system')
  })
})

describe('engine/load-model — validation', () => {
  it('accepts a well-formed catalogue and returns identifiers', () => {
    const { identifiers } = loadModel(model(record()))
    expect(identifiers.idOf('email')).toBe(record().id)
  })

  it('parses JSON strings', () => {
    expect(loadModel(JSON.stringify(model(record()))).obligations).toHaveLength(
      1
    )
  })

  it('rejects an empty or missing obligations array', () => {
    expect(() => loadModel({})).toThrow('non-empty obligations array')
    expect(() => loadModel(model())).toThrow('non-empty obligations array')
  })

  it('rejects scoping/mandate/presentation keys on the record (line-196 guard)', () => {
    for (const key of ['scopeWhen', 'mandate', 'label', 'page']) {
      expect(() => loadModel(model(record({ [key]: 'x' })))).toThrow(
        `forbidden key "${key}"`
      )
    }
  })

  it('rejects malformed ids, names and unknown types', () => {
    expect(() => loadModel(model(record({ id: 'not-a-uuid' })))).toThrow(
      'committed UUID'
    )
    expect(() => loadModel(model(record({ name: 'Full Name' })))).toThrow(
      'code-shaped'
    )
    expect(() => loadModel(model(record({ type: 'hologram' })))).toThrow(
      'no companion in the type registry'
    )
  })

  it('rejects duplicate identifiers via the identifier index', () => {
    const other = record({ id: idOf('phone') })
    expect(() => loadModel(model(record(), other))).toThrow(
      'Duplicate obligation name'
    )
  })

  it('polices the cardinality x indexedBy taxonomy', () => {
    expect(() => loadModel(model(record({ cardinality: 'many' })))).toThrow(
      'unknown cardinality "many"'
    )
    expect(() =>
      loadModel(
        model(
          record({
            indexedBy: { source: 'user', mutability: 'edit-add-remove' }
          })
        )
      )
    ).toThrow('single cardinality must not carry indexedBy')
    expect(() =>
      loadModel(
        model(
          record({
            cardinality: 'indexed',
            indexedBy: { source: 'magic', mutability: 'edit-only' }
          })
        )
      )
    ).toThrow('unknown indexedBy source "magic"')
    expect(() =>
      loadModel(
        model(
          record({
            cardinality: 'indexed',
            indexedBy: { source: 'user', mutability: 'reorder' }
          })
        )
      )
    ).toThrow('unknown indexedBy mutability "reorder"')
  })

  it('accepts seeded as a schema value (validated, unbuilt — INDEX reduce)', () => {
    const seeded = record({
      cardinality: 'indexed',
      indexedBy: { source: 'seeded', mutability: 'edit-add-remove' }
    })
    expect(() => loadModel(model(seeded))).not.toThrow()
  })

  it('resolves derived cross-references against the controller options', () => {
    const controller = record({
      id: idOf('addons'),
      name: 'addons',
      type: 'multi-select',
      options: ['named-driver']
    })
    const derived = (indexedBy) =>
      record({
        id: idOf('driverName'),
        name: 'driverName',
        type: 'text',
        cardinality: 'indexed',
        indexedBy: { source: 'derived', mutability: 'edit-only', ...indexedBy }
      })
    const good = derived({
      controllingObligation: controller.id,
      controllingValue: 'named-driver'
    })
    expect(() => loadModel(model(controller, good))).not.toThrow()
    expect(() =>
      loadModel(
        model(
          controller,
          derived({
            // postcode's real id — a valid UUID absent from this
            // two-record fixture model, so the cross-reference is unknown.
            controllingObligation: idOf('postcode'),
            controllingValue: 'named-driver'
          })
        )
      )
    ).toThrow('is unknown')
    expect(() =>
      loadModel(
        model(
          controller,
          derived({
            controllingObligation: controller.id,
            controllingValue: 'protected-ncd'
          })
        )
      )
    ).toThrow('not an option of "addons"')
  })

  it('asserts scope-registry coverage when a registry is supplied', () => {
    expect(() =>
      loadModel(model(record()), { scopeRegistry: journeyScopeRegistry })
    ).toThrow('Scope rules target unknown obligation')
  })
})
