import { describe, it, expect } from 'vitest'

import { reasonForImport } from './obligations/obligations.js'

import { flow } from './flow/flow.js'
import { pageSchema, optionListsForPage } from './controller-sketch.js'
import { buildDictionary, coverageReport } from './data-dictionary-sketch.js'

const findSection = (id) => flow.sections.find((s) => s.id === id)
const findPage = (sectionId, pageName) => {
  const walk = (node) => {
    if (node.page === pageName) return node
    for (const child of node.children ?? []) {
      const hit = walk(child)
      if (hit) return hit
    }
    return null
  }
  return walk(findSection(sectionId))
}

// ---------------------------------------------------------------------------
// controller-sketch
// ---------------------------------------------------------------------------

describe('pageSchema', () => {
  it('composes a joi-shaped object with keys per presents obligation', () => {
    const page = findPage('origin-and-reason', 'reason-for-import')
    const schema = pageSchema(page)
    expect(schema.kind).toBe('object')
    expect(schema.shape).toHaveProperty('reasonForImport')
    expect(schema.shape.reasonForImport.valid).toContain('internal-market')
  })

  it('resolves enum valid() from current fulfilments (dynamic options)', () => {
    const page = findPage('origin-and-reason', 'purpose-details')
    const schema = pageSchema(page, { [reasonForImport.id]: 'internal-market' })
    expect(schema.shape.purposeInInternalMarket.valid).toContain('breeding')
  })

  it('shrinks dynamic options when reason changes', () => {
    const page = findPage('origin-and-reason', 'purpose-details')
    const schema = pageSchema(page, {
      [reasonForImport.id]: 'transit'
    })
    expect(schema.shape.purposeInInternalMarket.valid).toEqual([])
  })
})

describe('optionListsForPage', () => {
  it('surfaces the enum options a controller would render', () => {
    const page = findPage('origin-and-reason', 'purpose-details')
    const lists = optionListsForPage(page, {
      [reasonForImport.id]: 'internal-market'
    })
    expect(lists.purposeInInternalMarket).toEqual([
      'transfer-of-ownership-sale-or-gift',
      'transfer-of-ownership-rescue',
      'breeding',
      'research',
      'racing-competition-show-or-training',
      'approved-premises-or-body',
      'companion-animal-not-for-resale-or-rehoming',
      'production',
      'slaughter',
      'fattening',
      'restocking'
    ])
  })
})

// ---------------------------------------------------------------------------
// data-dictionary-sketch
// ---------------------------------------------------------------------------

describe('buildDictionary', () => {
  it('yields one row per obligation', () => {
    const dict = buildDictionary()
    const names = dict.obligations.map((o) => o.name)
    expect(names).toContain('reasonForImport')
    expect(names).toContain('purposeInInternalMarket')
    expect(names).toContain('arrivalDateAtPort')
    expect(names).toContain('animalsCertifiedFor')
  })

  it('reflects the reason obligation as staticEnum', () => {
    const row = buildDictionary().obligations.find(
      (o) => o.name === 'reasonForImport'
    )
    expect(row.domain.shape).toBe('staticEnum')
    expect(row.domain.options).toContain('internal-market')
  })

  it('reflects purposeInInternalMarket as computedEnum with readsFrom', () => {
    const row = buildDictionary().obligations.find(
      (o) => o.name === 'purposeInInternalMarket'
    )
    expect(row.domain.shape).toBe('computedEnum')
    expect(row.domain.readsFrom).toEqual(['reasonForImport'])
  })

  it('reflects arrivalDateAtPort as predicate with reason codes', () => {
    const row = buildDictionary().obligations.find(
      (o) => o.name === 'arrivalDateAtPort'
    )
    expect(row.domain.shape).toBe('predicate')
    expect(row.domain.reasons).toContain('domain.date.format')
  })

  it('reflects transitedCountries as a staticEnum-with-max-selections', () => {
    const row = buildDictionary().obligations.find(
      (o) => o.name === 'transitedCountries'
    )
    expect(row.domain.shape).toBe('staticEnumWithMaxSelections')
    expect(row.domain.max).toBe(12)
  })

  it('surfaces obligation scope shape from applyTo.metadata (when helper-derived)', () => {
    const row = buildDictionary().obligations.find(
      (o) => o.name === 'purposeInInternalMarket'
    )
    // purposeInInternalMarket uses branchedGate; metadata should carry
    // the branch predicate description.
    expect(row.scope.type ?? row.scope.kind).toBeDefined()
  })
})

describe('coverageReport', () => {
  it('flags obligations that have no domain entry', () => {
    const report = coverageReport()
    expect(report.total).toBeGreaterThan(0)
    expect(report.withDomainEntry).toBeGreaterThan(0)
    // After iteration 10 the only uncovered obligations are the two
    // structural group containers (commodityLine, unitRecord) — they
    // never need a domain entry because they carry no value directly;
    // their descendants do. The report exposes them as "missing" and
    // the invariant we care about is that they're the ONLY thing
    // left. If a new leaf obligation lands without a domain entry,
    // this length assertion fires.
    // The 5 exempt entries:
    // - 2 structural group containers (commodityLine, unitRecord)
    // - 1 invariant-carrier container (accompanyingDocument — carries
    //   requires.allOrNothingOfIds; its four scalar members carry the
    //   values)
    // - 2 system-populated fields (poApprovedReferenceNumber,
    //   responsiblePersonForLoad) declared for V4 completeness but
    //   enforced upstream (system minting; gov.identity).
    // If a new leaf obligation lands without a domain entry, this
    // length assertion fires.
    expect(new Set(report.missing)).toEqual(
      new Set([
        'poApprovedReferenceNumber',
        'responsiblePersonForLoad',
        'commodityLine',
        'unitRecord',
        'accompanyingDocument'
      ])
    )
  })
})
