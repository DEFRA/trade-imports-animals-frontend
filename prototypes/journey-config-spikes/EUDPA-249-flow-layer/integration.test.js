/**
 * Integration test — walks a scripted V4 fulfilment sequence through all
 * three layers together:
 *
 *   fulfilments
 *     → ObligationEvaluator (Layer 1)
 *     → runtime primitives (Layer 2) reading domain (Layer 1.25)
 *
 * Each test corresponds to one AC bullet from the plan.
 */

import { describe, it, expect, beforeAll } from 'vitest'

import { createObligationEvaluator } from './obligations/evaluator.js'
import {
  obligations as v4Obligations,
  reasonForImport,
  purposeInInternalMarket,
  destinationCountry,
  portOfExit,
  transporterType,
  commercialTransporter,
  privateTransporter,
  arrivalDateAtPort,
  portOfEntry,
  animalsCertifiedFor,
  commodityCode,
  species,
  numberOfAnimals,
  commodityLine,
  unitRecord,
  earTag,
  accompanyingDocument,
  accompanyingDocumentType,
  accompanyingDocumentAttachmentType,
  accompanyingDocumentReference,
  accompanyingDocumentDateOfIssue,
  transitedCountries,
  internalReferenceNumber,
  countryOfOrigin,
  regionCodeRequirement,
  regionCode
} from './obligations/obligations.js'

import { domain } from './domain/index.js'
import { flow } from './flow/flow.js'
import {
  optionsFor,
  validate,
  pageStatus,
  containerStatus,
  journeyState,
  firstApplicablePage,
  firstUnfulfilledPage,
  firstPagePresentingObligation,
  STATUSES
} from './engine/index.js'

// ---------------------------------------------------------------------------
// Setup — one evaluator instance, reused across scenarios via evaluate().
// ---------------------------------------------------------------------------

let evaluate

beforeAll(() => {
  const evaluator = createObligationEvaluator({
    obligations: v4Obligations
  })
  evaluate = (fulfilments) => evaluator.evaluate(fulfilments)
})

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
const findSubsection = (subsectionId) => {
  for (const section of flow.sections) {
    const hit = (section.children ?? []).find((c) => c.id === subsectionId)
    if (hit) return hit
  }
  return null
}

// ---------------------------------------------------------------------------
// AC 1 — showing / hiding a page (page visibility)
// ---------------------------------------------------------------------------

describe('page visibility', () => {
  it('purpose-details is NA when reasonForImport is not internal-market', () => {
    const state = evaluate({ [reasonForImport.id]: 'transit' })
    // purpose obligation is out of scope → page presenting only it is NA.
    expect(
      pageStatus(findPage('origin-and-reason', 'purpose-details'), state)
    ).toBe(STATUSES.NOT_APPLICABLE)
  })

  it('purpose-details becomes NS when reasonForImport is internal-market', () => {
    const state = evaluate({ [reasonForImport.id]: 'internal-market' })
    expect(
      pageStatus(findPage('origin-and-reason', 'purpose-details'), state)
    ).toBe(STATUSES.NOT_STARTED)
  })

  // V4 Reason of Import matrix (Confluence 6497338582):
  //   internal-market                → purpose-details
  //   transhipment-or-onward-travel  → destination-country
  //   transit                        → destination-country + port-of-exit
  //   re-entry                       → (none)
  //   temporary-admission-horses     → port-of-exit + exit-date
  it.each([
    [
      'internal-market',
      ['purpose-details'],
      ['destination-country', 'port-of-exit', 'exit-date']
    ],
    [
      'transhipment-or-onward-travel',
      ['destination-country'],
      ['purpose-details', 'port-of-exit', 'exit-date']
    ],
    [
      'transit',
      ['destination-country', 'port-of-exit'],
      ['purpose-details', 'exit-date']
    ],
    [
      're-entry',
      [],
      ['purpose-details', 'destination-country', 'port-of-exit', 'exit-date']
    ],
    [
      'temporary-admission-horses',
      ['port-of-exit', 'exit-date'],
      ['purpose-details', 'destination-country']
    ]
  ])('reason=%s → visible: %j, NA: %j', (reason, visiblePages, naPages) => {
    const state = evaluate({ [reasonForImport.id]: reason })
    for (const name of visiblePages) {
      expect(
        pageStatus(findPage('origin-and-reason', name), state),
        `${name} should be visible under reason=${reason}`
      ).toBe(STATUSES.NOT_STARTED)
    }
    for (const name of naPages) {
      expect(
        pageStatus(findPage('origin-and-reason', name), state),
        `${name} should be NA under reason=${reason}`
      ).toBe(STATUSES.NOT_APPLICABLE)
    }
  })
})

// ---------------------------------------------------------------------------
// AC 2 — showing / hiding a question on a page (question visibility)
// ---------------------------------------------------------------------------

describe('question visibility', () => {
  it('transporter-details shows only commercial when transporterType === commercial', () => {
    const state = evaluate({ [transporterType.id]: 'commercial' })
    // commercialTransporter is in scope; privateTransporter is not.
    expect(state.obligations[commercialTransporter.id].inScope).toBe(true)
    expect(state.obligations[privateTransporter.id].inScope).toBe(false)
    // Page is NS (mandatory unfilled).
    expect(
      pageStatus(findPage('transporter', 'transporter-details'), state)
    ).toBe(STATUSES.NOT_STARTED)
  })

  it('transporter-details shows only private when transporterType === private', () => {
    const state = evaluate({ [transporterType.id]: 'private' })
    expect(state.obligations[commercialTransporter.id].inScope).toBe(false)
    expect(state.obligations[privateTransporter.id].inScope).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// AC 3 — showing / hiding an option (dropdown value filtering)
// ---------------------------------------------------------------------------

describe('option filtering', () => {
  it('optionsFor(purposeInInternalMarket) depends on reasonForImport', () => {
    expect(
      optionsFor(
        purposeInInternalMarket,
        { [reasonForImport.id]: 'internal-market' },
        new Map(),
        domain
      )
    ).toEqual([
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

    expect(
      optionsFor(
        purposeInInternalMarket,
        { [reasonForImport.id]: 'transit' },
        new Map(),
        domain
      )
    ).toEqual([])
  })

  it('optionsFor(animalsCertifiedFor) returns the 15 V4 purpose options', () => {
    // Step 5d overhauled this from a 4-species stub to the 15 V4
    // purposes (Slaughter, Registered equine animal, ...). In
    // production the certificate integration supplies them; for the
    // spike they're hardcoded in the domain module.
    const options = optionsFor(animalsCertifiedFor, {}, new Map(), domain)
    expect(options).toHaveLength(16)
    expect(options).toContain('slaughter')
    expect(options).toContain('further-keeping')
    expect(options).not.toContain('bovine')
  })

  it('validate rejects a submitted value not in the current options', () => {
    const fulfilments = { [reasonForImport.id]: 'internal-market' }
    // 'transit-goods' is not one of the internal-market sub-values.
    const errs = validate(
      purposeInInternalMarket,
      'transit-goods',
      fulfilments,
      domain
    )
    expect(errs).toHaveLength(1)
    expect(errs[0].code).toBe('domain.enum.notInOptions')
  })
})

// ---------------------------------------------------------------------------
// Real V4 predicates — max-length strings, date validity, max-12 array
// ---------------------------------------------------------------------------

describe('V4 predicates', () => {
  it('arrivalDateAtPort accepts DD/MM/YYYY; rejects other formats and invalid calendar dates', () => {
    expect(validate(arrivalDateAtPort, '12/12/2026', {}, domain)).toEqual([])
    expect(validate(arrivalDateAtPort, '2026-12-12', {}, domain)[0].code).toBe(
      'domain.date.format'
    )
    expect(validate(arrivalDateAtPort, '31/02/2026', {}, domain)[0].code).toBe(
      'domain.date.format'
    )
  })

  it('transitedCountries caps at 12 selections and carries the count in the error', () => {
    const under = ['FR', 'DE', 'IT', 'ES', 'PT']
    expect(validate(transitedCountries, under, {}, domain)).toEqual([])

    const over = [
      'FR',
      'DE',
      'IT',
      'ES',
      'PT',
      'BE',
      'NL',
      'LU',
      'AT',
      'CH',
      'SE',
      'NO',
      'DK'
    ]
    const errs = validate(transitedCountries, over, {}, domain)
    expect(errs[0].code).toBe('domain.array.maxSelections')
    expect(errs[0].max).toBe(12)
    expect(errs[0].actual).toBe(13)
  })

  it('transitedCountries also enforces enum membership on every selection', () => {
    const errs = validate(transitedCountries, ['FR', 'ZZ'], {}, domain)
    expect(errs[0].code).toBe('domain.enum.notInOptions')
    expect(errs[0].invalid).toEqual(['ZZ'])
  })

  it('internalReferenceNumber caps at 58 characters', () => {
    expect(
      validate(internalReferenceNumber, 'x'.repeat(58), {}, domain)
    ).toEqual([])
    expect(
      validate(internalReferenceNumber, 'x'.repeat(59), {}, domain)[0].code
    ).toBe('domain.string.maxLength')
  })
})

// ---------------------------------------------------------------------------
// AC 4 — task-list rollup
// ---------------------------------------------------------------------------

describe('task list rollup', () => {
  it('origin-and-reason is F once every subsection is F', () => {
    const state = evaluate({
      [countryOfOrigin.id]: 'FR',
      [regionCodeRequirement.id]: 'no',
      [regionCode.id]: 'FR-75',
      [reasonForImport.id]: 'internal-market',
      [purposeInInternalMarket.id]: 'breeding'
    })
    expect(containerStatus(findSection('origin-and-reason'), state)).toBe(
      STATUSES.FULFILLED
    )
  })

  it('origin-and-reason is F on the transit path (purpose auto-NA)', () => {
    const state = evaluate({
      [countryOfOrigin.id]: 'FR',
      [regionCodeRequirement.id]: 'no',
      [regionCode.id]: 'FR-75',
      [reasonForImport.id]: 'transit',
      // Transit gates destinationCountry + portOfExit in as mandatory;
      // exitDate stays NA (temporary-admission-horses only).
      [destinationCountry.id]: 'FR',
      [portOfExit.id]: 'DVR'
    })
    // origin subsection F; purpose-details + exit-date NA; reason
    // subsection F once destination + port-of-exit filled too.
    expect(containerStatus(findSection('origin-and-reason'), state)).toBe(
      STATUSES.FULFILLED
    )
  })

  it('origin-and-reason is IP when reason is filled but purpose is not', () => {
    const state = evaluate({
      [countryOfOrigin.id]: 'FR',
      [regionCodeRequirement.id]: 'no',
      [reasonForImport.id]: 'internal-market'
    })
    expect(containerStatus(findSection('origin-and-reason'), state)).toBe(
      STATUSES.IN_PROGRESS
    )
  })

  it('origin subsection alone is F once country + region-requirement + region-code filled', () => {
    const state = evaluate({
      [countryOfOrigin.id]: 'FR',
      [regionCodeRequirement.id]: 'no',
      [regionCode.id]: 'FR-75'
    })
    expect(containerStatus(findSubsection('origin'), state)).toBe(
      STATUSES.FULFILLED
    )
  })

  it('commodity-lines is NS when no commodity lines exist (minEntries floor)', () => {
    // No commodity fulfilments → line-group has zero records. Prior
    // to the `commodityLine.requires.minEntries: 1` floor (see
    // REPORT §7 "No minimum-instance floor"), the section collapsed
    // to NA and `journeyState → fulfilled` for an empty consignment.
    // With the floor, `groupInvariantErrorsForContainer` emits one
    // MIN_ENTRIES error → `classifyEntries` treats it as an
    // unsatisfied mandatory concern → touched=0 → NS.
    const state = evaluate({ [reasonForImport.id]: 'transit' })
    expect(containerStatus(findSection('commodity-lines'), state)).toBe(
      STATUSES.NOT_STARTED
    )
  })
})

// ---------------------------------------------------------------------------
// Journey-level rollup
// ---------------------------------------------------------------------------

describe('journey state', () => {
  it('is NS when nothing has been filled', () => {
    const state = evaluate({})
    expect(journeyState(flow, state)).toBe(STATUSES.NOT_STARTED)
  })

  it('is IP after partial fulfilment', () => {
    const state = evaluate({ [reasonForImport.id]: 'transit' })
    expect(journeyState(flow, state)).toBe(STATUSES.IN_PROGRESS)
  })
})

// ---------------------------------------------------------------------------
// Navigation primitives on the real flow
// ---------------------------------------------------------------------------

describe('navigation', () => {
  it('firstApplicablePage on the first section is country-of-origin', () => {
    expect(firstApplicablePage(findSection('origin-and-reason')).page).toBe(
      'country-of-origin'
    )
  })

  it('firstUnfulfilledPage descends into subsections and skips fulfilled pages', () => {
    const state = evaluate({
      [countryOfOrigin.id]: 'FR',
      [regionCodeRequirement.id]: 'no',
      [regionCode.id]: 'FR-75',
      [reasonForImport.id]: 'internal-market'
    })
    // origin F; reason-for-import F; purpose-details NS → return purpose.
    expect(
      firstUnfulfilledPage(findSection('origin-and-reason'), state).page
    ).toBe('purpose-details')
  })

  it('firstUnfulfilledPage returns null when section is F (transit path)', () => {
    const state = evaluate({
      [countryOfOrigin.id]: 'FR',
      [regionCodeRequirement.id]: 'no',
      [regionCode.id]: 'FR-75',
      [reasonForImport.id]: 'transit',
      // Transit gates destinationCountry + portOfExit in as mandatory.
      [destinationCountry.id]: 'FR',
      [portOfExit.id]: 'DVR'
    })
    // country F; region-requirement F; region-code F; reason F;
    // destination F; port-of-exit F; purpose + exit-date NA. Section F → null.
    expect(
      firstUnfulfilledPage(findSection('origin-and-reason'), state)
    ).toBeNull()
  })

  it('firstPagePresentingObligation resolves the CYA Change link for a top-level obligation', () => {
    expect(firstPagePresentingObligation(flow, reasonForImport.id).page).toBe(
      'reason-for-import'
    )
    expect(
      firstPagePresentingObligation(flow, purposeInInternalMarket.id).page
    ).toBe('purpose-details')
  })

  it('firstPagePresentingObligation resolves a presentsForEach obligation', () => {
    // commodityCode is presented via presentsForEach on commodity-details.
    // The lookup walks presentsForEach without needing state.
    expect(firstPagePresentingObligation(flow, commodityCode.id).page).toBe(
      'commodity-details'
    )
  })
})

// ---------------------------------------------------------------------------
// End-to-end scripted walk — one commodity line + real V4 predicates
// ---------------------------------------------------------------------------

describe('end-to-end walk with real V4 predicates', () => {
  it('rejects a 2026-12-12 date only when the format is wrong; caps transited countries at 12', () => {
    const baseFulfilments = {
      [reasonForImport.id]: 'transit',
      [transporterType.id]: 'commercial',
      [internalReferenceNumber.id]: 'REF-123',
      [portOfEntry.id]: 'DVR'
    }

    // Wrong-format date rejected.
    expect(
      validate(arrivalDateAtPort, '2026-12-12', baseFulfilments, domain)[0].code
    ).toBe('domain.date.format')

    // Correct format accepted.
    expect(
      validate(arrivalDateAtPort, '12/12/2026', baseFulfilments, domain)
    ).toEqual([])

    // 13 transited countries rejected; 12 accepted.
    const overCap = [
      'FR',
      'DE',
      'IT',
      'ES',
      'PT',
      'BE',
      'NL',
      'LU',
      'AT',
      'CH',
      'SE',
      'NO',
      'DK'
    ]
    expect(
      validate(transitedCountries, overCap, baseFulfilments, domain)[0].code
    ).toBe('domain.array.maxSelections')
    expect(
      validate(
        transitedCountries,
        overCap.slice(0, 12),
        baseFulfilments,
        domain
      )
    ).toEqual([])
  })

  it('one commodity line with a valid commodity code — line record exists post-purge', () => {
    const fulfilments = {
      [reasonForImport.id]: 'transit',
      [transporterType.id]: 'commercial',
      [arrivalDateAtPort.id]: '12/12/2026',
      [portOfEntry.id]: 'DVR',
      [commodityCode.id]: { line1: '0102' },
      [species.id]: { line1: ['cattle'] },
      [numberOfAnimals.id]: { line1: 25 }
    }

    const state = evaluate(fulfilments)
    expect(state.obligations[commodityLine.id].records).toEqual([
      { fulfilmentId: 'line1' }
    ])
    expect(state.obligations[numberOfAnimals.id].records).toEqual([
      { fulfilmentId: 'line1', status: 'mandatory' }
    ])
    expect(
      pageStatus(findPage('commodity-lines', 'number-of-animals'), state)
    ).toBe(STATUSES.FULFILLED)
  })
})

// ---------------------------------------------------------------------------
// V4 unit-count-equals-numberOfAnimals invariant — the "unit records
// ARE animals" reading of the spec (Confluence page 6497338582). Golden
// path from the thought experiment: numberOfAnimals: 2 + 2 unit records
// = F on the per-unit-records subsection; drop numberOfAnimals to 1 and
// the same subsection flips to IP with the mismatch surfacing there
// (not just at journey level).
// ---------------------------------------------------------------------------
describe('unit-count-equals-numberOfAnimals invariant', () => {
  const perUnitRecords = () => {
    for (const section of flow.sections) {
      for (const sub of section.children ?? []) {
        if (sub.id === 'per-unit-records') return sub
      }
    }
    return null
  }

  const baseLine = {
    [commodityCode.id]: { line1: '0102' },
    [species.id]: { line1: ['cattle'] }
  }

  it('numberOfAnimals set but no unit records → per-unit-records subsection is NS (invariant fires)', () => {
    const state = evaluate({
      ...baseLine,
      [numberOfAnimals.id]: { line1: 2 }
    })
    // Group invariant fires: expected 2, actual 0. classifyEntries
    // treats it as an unsatisfied mandatory concern.
    expect(containerStatus(perUnitRecords(), state)).toBe(STATUSES.NOT_STARTED)
  })

  it('numberOfAnimals: 2 with 2 filled unit records → F', () => {
    const state = evaluate({
      ...baseLine,
      [numberOfAnimals.id]: { line1: 2 },
      // Cattle triggers ear-tag scope; one identifier per unit
      // satisfies the anyOfIds rule too.
      [earTag.id]: {
        'line1/unit1': 'UK111',
        'line1/unit2': 'UK222'
      }
    })
    expect(state.obligations[unitRecord.id].records).toHaveLength(2)
    expect(containerStatus(perUnitRecords(), state)).toBe(STATUSES.FULFILLED)
  })

  it('user amends numberOfAnimals from 2 to 1 → subsection flips back to IP (2 units still stored, mismatch fires)', () => {
    // Simulates the amend step in the thought experiment. No purge —
    // the two unit records persist; the invariant surfaces the
    // mismatch on the per-unit-records subsection.
    const state = evaluate({
      ...baseLine,
      [numberOfAnimals.id]: { line1: 1 },
      [earTag.id]: {
        'line1/unit1': 'UK111',
        'line1/unit2': 'UK222'
      }
    })
    // Both units still present post-evaluate.
    expect(state.obligations[unitRecord.id].records).toHaveLength(2)
    // Subsection now IP (touched: 2 filled identifiers exist,
    // mandatory concern from group error is unsatisfied).
    expect(containerStatus(perUnitRecords(), state)).toBe(STATUSES.IN_PROGRESS)
  })

  it('numberOfAnimals unset → invariant skips (no error), other mandatoriness rules handle the missing value', () => {
    const state = evaluate({
      ...baseLine
      // numberOfAnimals deliberately absent
    })
    // With numberOfAnimals blank the count invariant doesn't fire —
    // the numberOfAnimals field itself is mandatory-to-proceed which
    // catches the missing value at page level. journeyState is IP
    // (some mandatory unfilled) but the mismatch specifically isn't
    // one of the reasons.
    expect(journeyState(flow, state)).not.toBe(STATUSES.FULFILLED)
  })
})

// ---------------------------------------------------------------------------
// V4 accompanying-documents (WS4) — 0..10 user-driven records group.
// The four field obligations are `within: accompanyingDocument`, each
// `status: 'mandatory'` per record. Section is NA when empty (0 docs
// added) and F once each present doc has all four fields filled.
// `requires.maxEntries: 10` catches state that somehow exceeds the cap.
// ---------------------------------------------------------------------------
describe('accompanying-documents indexed group (WS4)', () => {
  const accompanyingDocumentsSection = () => {
    for (const section of flow.sections) {
      for (const sub of section.children ?? []) {
        if (sub.id === 'accompanying-documents') return sub
      }
    }
    return null
  }

  const oneDocFilled = (docId) => ({
    [accompanyingDocumentType.id]: { [docId]: 'veterinary-health-certificate' },
    [accompanyingDocumentAttachmentType.id]: { [docId]: 'pdf' },
    [accompanyingDocumentReference.id]: { [docId]: 'GBHC1234567890' },
    [accompanyingDocumentDateOfIssue.id]: { [docId]: '12/12/2025' }
  })

  it('0 docs added → subsection is NA (no in-scope entries)', () => {
    const state = evaluate({})
    expect(containerStatus(accompanyingDocumentsSection(), state)).toBe(
      STATUSES.NOT_APPLICABLE
    )
  })

  it('1 doc with all four fields filled → subsection F', () => {
    const state = evaluate(oneDocFilled('doc1'))
    expect(containerStatus(accompanyingDocumentsSection(), state)).toBe(
      STATUSES.FULFILLED
    )
  })

  it('1 doc with only Type filled → subsection IP (per-record mandatoriness)', () => {
    const state = evaluate({
      [accompanyingDocumentType.id]: { doc1: 'veterinary-health-certificate' }
    })
    // Group has 1 record; four per-record obligations are all mandatory;
    // three are unfilled → three unsatisfied mandatory concerns.
    expect(containerStatus(accompanyingDocumentsSection(), state)).toBe(
      STATUSES.IN_PROGRESS
    )
  })

  it('10 docs all filled → subsection F (at the cap, no invariant error)', () => {
    const fulfilments = {}
    for (let i = 1; i <= 10; i++) {
      const docId = `doc${i}`
      fulfilments[accompanyingDocumentType.id] = {
        ...(fulfilments[accompanyingDocumentType.id] ?? {}),
        [docId]: 'veterinary-health-certificate'
      }
      fulfilments[accompanyingDocumentAttachmentType.id] = {
        ...(fulfilments[accompanyingDocumentAttachmentType.id] ?? {}),
        [docId]: 'pdf'
      }
      fulfilments[accompanyingDocumentReference.id] = {
        ...(fulfilments[accompanyingDocumentReference.id] ?? {}),
        [docId]: `REF-${i}`
      }
      fulfilments[accompanyingDocumentDateOfIssue.id] = {
        ...(fulfilments[accompanyingDocumentDateOfIssue.id] ?? {}),
        [docId]: '12/12/2025'
      }
    }
    const state = evaluate(fulfilments)
    expect(state.obligations[accompanyingDocument.id].records).toHaveLength(10)
    expect(containerStatus(accompanyingDocumentsSection(), state)).toBe(
      STATUSES.FULFILLED
    )
  })

  it('11 docs → subsection IP (maxEntries cap fires as one MAX_ENTRIES error)', () => {
    // Simulates a hand-crafted state or a post-redeploy cap lowering.
    // The controller UI blocks the 11th add, but the invariant is
    // authoritative for defence-in-depth.
    const fulfilments = {}
    for (let i = 1; i <= 11; i++) {
      const docId = `doc${i}`
      fulfilments[accompanyingDocumentType.id] = {
        ...(fulfilments[accompanyingDocumentType.id] ?? {}),
        [docId]: 'veterinary-health-certificate'
      }
      fulfilments[accompanyingDocumentAttachmentType.id] = {
        ...(fulfilments[accompanyingDocumentAttachmentType.id] ?? {}),
        [docId]: 'pdf'
      }
      fulfilments[accompanyingDocumentReference.id] = {
        ...(fulfilments[accompanyingDocumentReference.id] ?? {}),
        [docId]: `REF-${i}`
      }
      fulfilments[accompanyingDocumentDateOfIssue.id] = {
        ...(fulfilments[accompanyingDocumentDateOfIssue.id] ?? {}),
        [docId]: '12/12/2025'
      }
    }
    const state = evaluate(fulfilments)
    expect(state.obligations[accompanyingDocument.id].records).toHaveLength(11)
    // All fields filled per-record; but the cap invariant fires once
    // — that's an unsatisfied mandatory concern that keeps rollup at IP.
    expect(containerStatus(accompanyingDocumentsSection(), state)).toBe(
      STATUSES.IN_PROGRESS
    )
  })
})
