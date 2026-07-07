/**
 * Obligation-level unit tests for the applyTo + helpers prototype.
 *
 * Point of this file: demonstrate the "test at obligation level
 * without other units" claim. Each test calls
 * `obligation.applyTo(fulfilments, fulfilmentIdsByObligationId)`
 * directly — plain function, plain inputs. Zero dependency on the
 * evaluator, on the resolver, on `obligationsById` construction, or on
 * the rest of the manifest.
 *
 * Compare with testing the gatedBy version, which requires either
 * running the full evaluator (integration test) or manually invoking
 * `resolveGatedBy(passport.gatedBy, passport, fulfilments,
 * obligationsById)` — the latter is a unit test in name only, and
 * still requires constructing a fake `obligationsById`.
 */

import { describe, it, expect } from 'vitest'
import { commodityCode, unitRecord } from './obligations.js'
import {
  passport,
  tattoo,
  earTag,
  horseName,
  identificationDetails,
  description,
  permanentAddress,
  accompanyingDocumentType,
  accompanyingDocumentAttachmentType,
  accompanyingDocumentReference,
  accompanyingDocumentDateOfIssue
} from './obligations-all-applyto.js'

// ---------------------------------------------------------------------------
// Depth-2 identifier obligations
// ---------------------------------------------------------------------------

describe('passport (applyTo + helpers version)', () => {
  it('is in scope with records for units on a passport-list line', () => {
    const fulfilments = { [commodityCode.id]: { line1: '0101' } } // horse
    const ids = new Map([[unitRecord.id, ['line1/unit1', 'line1/unit2']]])
    const decision = passport.applyTo(fulfilments, ids)
    expect(decision).toEqual({
      inScope: true,
      records: ['line1/unit1', 'line1/unit2']
    })
  })

  it('is out of scope when no line has a passport-list code', () => {
    const fulfilments = { [commodityCode.id]: { line1: '01064100' } } // bees
    const ids = new Map()
    expect(passport.applyTo(fulfilments, ids)).toEqual({ inScope: false })
  })

  it('records only include units on matching lines (mixed manifest)', () => {
    const fulfilments = {
      [commodityCode.id]: { line1: '0102', line2: '01064100' } // cattle, bees
    }
    const ids = new Map([
      [unitRecord.id, ['line1/unit1', 'line1/unit2', 'line2/unit1']]
    ])
    expect(passport.applyTo(fulfilments, ids)).toEqual({
      inScope: true,
      records: ['line1/unit1', 'line1/unit2']
    })
  })
})

describe('tattoo (applyTo + helpers version)', () => {
  it('is in scope for cats/dogs/ferrets', () => {
    const fulfilments = { [commodityCode.id]: { line1: '01061900' } }
    const ids = new Map([[unitRecord.id, ['line1/unit1']]])
    expect(tattoo.applyTo(fulfilments, ids)).toEqual({
      inScope: true,
      records: ['line1/unit1']
    })
  })

  it('is out of scope for horse', () => {
    const fulfilments = { [commodityCode.id]: { line1: '0101' } }
    expect(tattoo.applyTo(fulfilments, new Map())).toEqual({ inScope: false })
  })
})

describe('earTag (applyTo + helpers version)', () => {
  it('is in scope for cattle and sheep on the same evaluation', () => {
    const fulfilments = {
      [commodityCode.id]: { line1: '0102', line2: '010410' }
    }
    const ids = new Map([[unitRecord.id, ['line1/unit1', 'line2/unit1']]])
    expect(earTag.applyTo(fulfilments, ids)).toEqual({
      inScope: true,
      records: ['line1/unit1', 'line2/unit1']
    })
  })
})

describe('horseName (applyTo + helpers version)', () => {
  it('is in scope only for the horse commodity code', () => {
    const fulfilments = { [commodityCode.id]: { line1: '0101' } }
    const ids = new Map([[unitRecord.id, ['line1/unit1']]])
    expect(horseName.applyTo(fulfilments, ids)).toEqual({
      inScope: true,
      records: ['line1/unit1']
    })
  })

  it('is out of scope for cattle', () => {
    const fulfilments = { [commodityCode.id]: { line1: '0102' } }
    expect(horseName.applyTo(fulfilments, new Map())).toEqual({
      inScope: false
    })
  })
})

// ---------------------------------------------------------------------------
// Inverse-gate obligations
// ---------------------------------------------------------------------------

describe('identificationDetails (inverse gate — no specific identifier applies)', () => {
  it('is in scope for bees (no specific identifier for that code)', () => {
    const fulfilments = { [commodityCode.id]: { line1: '01064100' } }
    const ids = new Map([[unitRecord.id, ['line1/unit1']]])
    expect(identificationDetails.applyTo(fulfilments, ids)).toEqual({
      inScope: true,
      records: ['line1/unit1']
    })
  })

  it('is out of scope for cattle (passport / tattoo / earTag apply)', () => {
    const fulfilments = { [commodityCode.id]: { line1: '0102' } }
    expect(identificationDetails.applyTo(fulfilments, new Map())).toEqual({
      inScope: false
    })
  })

  it('is out of scope for horse (passport / horseName apply)', () => {
    const fulfilments = { [commodityCode.id]: { line1: '0101' } }
    expect(identificationDetails.applyTo(fulfilments, new Map())).toEqual({
      inScope: false
    })
  })
})

describe('description (same inverse gate as identificationDetails)', () => {
  it('is in scope for bees', () => {
    const fulfilments = { [commodityCode.id]: { line1: '01064100' } }
    const ids = new Map([[unitRecord.id, ['line1/unit1']]])
    expect(description.applyTo(fulfilments, ids).inScope).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Permanent address
// ---------------------------------------------------------------------------

describe('permanentAddress (cats/dogs/ferrets only)', () => {
  it('is in scope for cats/dogs commodity', () => {
    const fulfilments = { [commodityCode.id]: { line1: '01061900' } }
    const ids = new Map([[unitRecord.id, ['line1/unit1']]])
    expect(permanentAddress.applyTo(fulfilments, ids)).toEqual({
      inScope: true,
      records: ['line1/unit1']
    })
  })

  it('is out of scope for cattle', () => {
    const fulfilments = { [commodityCode.id]: { line1: '0102' } }
    expect(permanentAddress.applyTo(fulfilments, new Map())).toEqual({
      inScope: false
    })
  })
})

// ---------------------------------------------------------------------------
// Accompanying document all-or-nothing block
// ---------------------------------------------------------------------------

const documentFields = [
  ['Type', accompanyingDocumentType],
  ['AttachmentType', accompanyingDocumentAttachmentType],
  ['Reference', accompanyingDocumentReference],
  ['DateOfIssue', accompanyingDocumentDateOfIssue]
]

describe('accompanying document block — no field filled', () => {
  it.each(documentFields)('%s is optional in-scope', (_name, obligation) => {
    expect(obligation.applyTo({}, new Map())).toEqual({
      inScope: true,
      status: 'optional'
    })
  })
})

describe('accompanying document block — any field filled', () => {
  const triggers = [
    ['Type', accompanyingDocumentType, 'Veterinary health certificate'],
    ['AttachmentType', accompanyingDocumentAttachmentType, 'PDF'],
    ['Reference', accompanyingDocumentReference, 'GBHC1234567890'],
    ['DateOfIssue', accompanyingDocumentDateOfIssue, '2025-12-12']
  ]

  it.each(triggers)(
    'when only %s is filled, all four fields are mandatory',
    (_name, filledObligation, filledValue) => {
      const fulfilments = { [filledObligation.id]: filledValue }
      for (const [, obligation] of documentFields) {
        const decision = obligation.applyTo(fulfilments, new Map())
        expect(decision.inScope).toBe(true)
        expect(decision.status).toBe('mandatory')
        expect(decision.reasons?.[0]?.code).toBe(
          'obligation.accompanyingDocument.mandatory.becauseAnyFieldPresent'
        )
      }
    }
  )
})

// ---------------------------------------------------------------------------
// Meta — the applyTo functions carry metadata for optional introspection
// ---------------------------------------------------------------------------

describe('helper-produced applyTo functions carry metadata', () => {
  it('passport.applyTo.metadata describes the gate declaratively', () => {
    expect(passport.applyTo.metadata).toEqual({
      type: 'allowListed',
      obligation: commodityCode.id,
      values: expect.any(Array),
      projection: unitRecord.id
    })
  })

  it('identificationDetails.applyTo.metadata omits the opaque predicate but keeps projection', () => {
    expect(identificationDetails.applyTo.metadata).toEqual({
      type: 'allowListedByPredicate',
      obligation: commodityCode.id,
      projection: unitRecord.id
    })
  })

  it('documentBlockApplyTo.metadata describes the branch shapes', () => {
    const decision = accompanyingDocumentType.applyTo.metadata
    expect(decision.type).toBe('branchedGate')
    expect(decision.whenTrue.status).toBe('mandatory')
    expect(decision.whenFalse.status).toBe('optional')
  })
})
