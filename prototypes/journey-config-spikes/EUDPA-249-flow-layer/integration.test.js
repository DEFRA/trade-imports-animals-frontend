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
      [reasonForImport.id]: 'transit'
    })
    // origin subsection F; purpose-details NA; reason subsection F.
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

  it('commodity-lines is NA when no commodity lines exist', () => {
    // No commodity fulfilments → line-group has no records → all
    // per-line pages collapse to NA; the intro is inherently NA →
    // section NA.
    const state = evaluate({ [reasonForImport.id]: 'transit' })
    expect(containerStatus(findSection('commodity-lines'), state)).toBe(
      STATUSES.NOT_APPLICABLE
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
      [reasonForImport.id]: 'transit'
    })
    // country F; region-requirement F; region-code F; reason F; purpose NA. Section F → null.
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
