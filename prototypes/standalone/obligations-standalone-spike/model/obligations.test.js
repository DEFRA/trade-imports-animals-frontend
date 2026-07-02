import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

/**
 * Pins the obligations-catalogue schema contract (obligations.md:196 — the
 * record declares WHAT data is canonical and nothing else). Read through `fs`,
 * not `import`, to keep the data/adapter split honest.
 */
const dirname = path.dirname(fileURLToPath(import.meta.url))
const { obligations } = JSON.parse(
  fs.readFileSync(path.join(dirname, 'obligations.json'), 'utf8')
)

const byName = new Map(obligations.map((record) => [record.name, record]))
const byId = new Map(obligations.map((record) => [record.id, record]))

// The 29 user-submitted fields of the mirrored journey plus the
// system-handled premium. Frozen — a rename edits a `name`, never this list
// AND the record's `id` together (see tests/rename-survival.test.js).
const EXPECTED_NAMES = [
  'email',
  'fullName',
  'preferredName',
  'phone',
  'postcode',
  'country',
  'dateOfBirth',
  'registration',
  'make',
  'model',
  'year',
  'estimatedValue',
  'vehiclePhoto',
  'yearsNoClaims',
  'hadClaims',
  'penaltyPoints',
  'claimType',
  'claimAmount',
  'coverType',
  'voluntaryExcess',
  'excessAmount',
  'extras',
  'addons',
  'driverName',
  'driverDob',
  'relationship',
  'modDescription',
  'modValue',
  'ncdYears',
  'premium'
]

// Every `type` in use must have a companion in the engine's type registry
// (the type-companion convention). Open space — additions extend this pin.
const EXPECTED_TYPES = [
  'boolean',
  'currency',
  'date',
  'email',
  'file',
  'formatted',
  'multi-select',
  'number',
  'quote',
  'radio',
  'select',
  'tel',
  'text',
  'textarea'
]

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

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('model/obligations.json — catalogue contract', () => {
  it('covers exactly the 30 journey obligations by name', () => {
    expect(obligations.map((record) => record.name)).toEqual(EXPECTED_NAMES)
  })

  it('gives every record a unique committed v4 UUID id', () => {
    for (const record of obligations) {
      expect(record.id).toMatch(UUID_V4)
    }
    expect(byId.size).toBe(obligations.length)
  })

  it('keeps names unique and code-shaped (the form/template/i18n binding)', () => {
    expect(byName.size).toBe(obligations.length)
    for (const record of obligations) {
      expect(record.name).toMatch(/^[a-z][a-zA-Z0-9]*$/)
    }
  })

  it('carries NO scoping, mandate or presentation keys (obligations.md:196)', () => {
    for (const record of obligations) {
      for (const key of Object.keys(record)) {
        expect(ALLOWED_KEYS, `${record.name} carries "${key}"`).toContain(key)
      }
    }
  })

  it('uses only types with a companion in the type registry', () => {
    const typesInUse = [...new Set(obligations.map((r) => r.type))].sort()
    expect(typesInUse).toEqual(EXPECTED_TYPES)
  })

  it('pins the indexedBy taxonomy on exactly the indexed records', () => {
    const indexed = obligations.filter((r) => r.cardinality === 'indexed')
    expect(indexed.map((r) => r.name).sort()).toEqual([
      'claimAmount',
      'claimType',
      'driverDob',
      'driverName',
      'modDescription',
      'modValue',
      'ncdYears',
      'relationship'
    ])
    for (const record of obligations) {
      expect(['single', 'indexed']).toContain(record.cardinality)
      if (record.cardinality === 'single') {
        expect(record.indexedBy).toBeUndefined()
        continue
      }
      expect(['user', 'derived', 'seeded']).toContain(record.indexedBy.source)
      expect(['edit-only', 'edit-add-remove']).toContain(
        record.indexedBy.mutability
      )
    }
  })

  it('mints user-sourced claims as edit-add-remove (pattern 1)', () => {
    for (const name of ['claimType', 'claimAmount']) {
      expect(byName.get(name).indexedBy).toEqual({
        source: 'user',
        mutability: 'edit-add-remove'
      })
    }
  })

  it('derives addon follow-ups from the addons obligation (pattern 2 via controllingValue)', () => {
    const controllers = {
      driverName: 'named-driver',
      driverDob: 'named-driver',
      relationship: 'named-driver',
      modDescription: 'modifications',
      modValue: 'modifications',
      ncdYears: 'protected-ncd'
    }
    const addons = byName.get('addons')
    for (const [name, controllingValue] of Object.entries(controllers)) {
      const { indexedBy } = byName.get(name)
      expect(indexedBy.source).toBe('derived')
      expect(indexedBy.mutability).toBe('edit-only')
      expect(indexedBy.controllingObligation).toBe(addons.id)
      expect(addons.options).toContain(indexedBy.controllingValue)
      expect(indexedBy.controllingValue).toBe(controllingValue)
    }
  })

  it('bundles option VALUE domains on choice-typed records only', () => {
    const choiceTypes = new Set(['select', 'radio', 'multi-select'])
    for (const record of obligations) {
      if (choiceTypes.has(record.type)) {
        expect(record.options.length).toBeGreaterThan(0)
        expect(new Set(record.options).size).toBe(record.options.length)
        for (const value of record.options) {
          expect(value).toMatch(/^[a-z]+(-[a-z]+)*$/)
        }
      } else {
        expect(record.options, `${record.name} bundles options`).toBeUndefined()
      }
    }
  })

  it('pins the parity option domains', () => {
    expect(byName.get('country').options).toEqual([
      'england',
      'scotland',
      'wales',
      'northern-ireland'
    ])
    expect(byName.get('coverType').options).toEqual([
      'comprehensive',
      'third-party-fire-theft',
      'third-party'
    ])
    expect(byName.get('extras').options).toEqual([
      'breakdown',
      'courtesy-car',
      'legal',
      'windscreen'
    ])
    expect(byName.get('claimType').options).toEqual([
      'accident',
      'theft',
      'windscreen',
      'other'
    ])
    expect(byName.get('relationship').options).toEqual([
      'spouse',
      'child',
      'parent',
      'other'
    ])
    expect(byName.get('addons').options).toEqual([
      'named-driver',
      'modifications',
      'protected-ncd'
    ])
  })

  it('marks premium as the sole system-handled obligation', () => {
    const handled = obligations.filter((r) => r.handler !== undefined)
    expect(handled.map((r) => r.name)).toEqual(['premium'])
    expect(byName.get('premium')).toMatchObject({
      type: 'quote',
      cardinality: 'single',
      handler: 'quote'
    })
  })
})
