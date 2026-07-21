import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { answersToFulfilments, fulfilmentsToAnswers } from './fulfilments.js'
import { createObligationEvaluator } from '../model/obligations/evaluator.js'
import {
  countryOfOrigin,
  regionCode,
  reasonForImport,
  purposeInInternalMarket,
  meansOfTransport,
  transitedCountries,
  transporterType,
  commercialTransporter,
  privateTransporter,
  portOfEntry,
  animalsCertifiedFor,
  commodityLine,
  commodityCode,
  species,
  numberOfAnimals,
  numberOfPackages,
  cph,
  unitRecord,
  earTag,
  accompanyingDocumentType,
  accompanyingDocumentAttachmentType,
  accompanyingDocumentReference,
  accompanyingDocumentDateOfIssue
} from '../model/obligations/obligations.js'

const happyPath = JSON.parse(
  readFileSync(new URL('../spec/fixtures/happy-path.json', import.meta.url))
).values

const address = {
  name: 'Origin Farm',
  address: { addressLine1: '1 Farm Lane', country: 'Ireland' }
}

// ---------------------------------------------------------------------------
// Round-trip property — answersToFulfilments then fulfilmentsToAnswers
// recovers the original A answers (except the non-injective commodity case,
// tested separately below as a known limitation).
// ---------------------------------------------------------------------------

describe('round-trip A -> B -> A recovers the original', () => {
  it('notification-level scalars (mixed vocabularies)', () => {
    const answers = {
      countryOfOrigin: 'FR',
      regionOfOriginCodeRequirement: 'yes',
      regionOfOriginCode: 'FR-75',
      reasonForImport: 'internalMarket',
      purposeInInternalMarket: 'breeding',
      meansOfTransport: 'Road Vehicle',
      transporterType: 'Commercial',
      portOfEntry: 'GB ABD',
      transitedCountries: ['FR', 'BE'],
      animalsCertifiedFor: 'slaughter',
      consignor: address
    }
    expect(fulfilmentsToAnswers(answersToFulfilments(answers))).toEqual(answers)
  })

  it('multi-line, multi-unit collection', () => {
    const answers = {
      commodityLines: [
        {
          commoditySelection: 'Cow',
          numberOfAnimalsQuantity: '25',
          speciesSelection: ['1148346'],
          animalIdentifiers: [
            { animalIdentifierEarTag: 'A' },
            { animalIdentifierEarTag: 'B' }
          ]
        },
        {
          commoditySelection: 'Horse',
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [{ horseName: 'Silver' }]
        }
      ]
    }
    expect(fulfilmentsToAnswers(answersToFulfilments(answers))).toEqual(answers)
  })

  it('a blank scalar value survives the round-trip (not dropped)', () => {
    const answers = { countryOfOrigin: '' }
    expect(fulfilmentsToAnswers(answersToFulfilments(answers))).toEqual(answers)
  })
})

// ---------------------------------------------------------------------------
// Shape — A positional path <-> B composite fulfilmentId, both directions.
// ---------------------------------------------------------------------------

describe('storage shape translation', () => {
  it('notification scalar stores the value directly under the UUID', () => {
    const fulfilments = answersToFulfilments({ countryOfOrigin: 'FR' })
    expect(fulfilments).toEqual({ [countryOfOrigin.id]: 'FR' })
    expect(fulfilmentsToAnswers(fulfilments)).toEqual({ countryOfOrigin: 'FR' })
  })

  it('depth-1 positional array -> single-segment composite (line<i>)', () => {
    const answers = {
      commodityLines: [
        { numberOfAnimalsQuantity: '10' },
        { numberOfAnimalsQuantity: '20' }
      ]
    }
    const fulfilments = answersToFulfilments(answers)
    // The count field is coerced to a NUMBER on the way in — the
    // model's recordCountEquals invariant compares it strictly against
    // a record tally — and back to the page's string on the way out.
    expect(fulfilments[numberOfAnimals.id]).toEqual({
      line0: 10,
      line1: 20
    })
    expect(fulfilmentsToAnswers(fulfilments)).toEqual(answers)
  })

  it('depth-2 nested array -> two-segment composite (line<i>/unit<j>)', () => {
    const answers = {
      commodityLines: [
        {
          animalIdentifiers: [
            { animalIdentifierEarTag: 'first' },
            { animalIdentifierEarTag: 'second' }
          ]
        }
      ]
    }
    const fulfilments = answersToFulfilments(answers)
    expect(fulfilments[earTag.id]).toEqual({
      'line0/unit0': 'first',
      'line0/unit1': 'second'
    })
    expect(fulfilmentsToAnswers(fulfilments)).toEqual(answers)
  })

  it('an empty collection cannot be represented in B (documented)', () => {
    // B infers group instances from descendant storage, so a group with no
    // answered leaves is invisible — an oracle blind spot (PLAN §3, D-notes).
    expect(answersToFulfilments({ commodityLines: [] })).toEqual({})
    expect(answersToFulfilments({ commodityLines: [{}] })).toEqual({})
  })

  it('a missing scalar is absent, not null', () => {
    expect(answersToFulfilments({})).toEqual({})
    expect(fulfilmentsToAnswers({})).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// Vocabulary normalisation — A -> B per divergent field; pass-through fields
// untouched.
// ---------------------------------------------------------------------------

describe('vocabulary normalisation A -> B', () => {
  it('commodity name -> CN code', () => {
    const fulfilments = answersToFulfilments({
      commodityLines: [{ commoditySelection: 'Cow' }]
    })
    expect(fulfilments[commodityCode.id]).toEqual({ line0: '0102' })
  })

  it('reasonForImport camelCase -> kebab', () => {
    expect(
      answersToFulfilments({ reasonForImport: 'internalMarket' })[
        reasonForImport.id
      ]
    ).toBe('internal-market')
  })

  it('meansOfTransport Title Case -> kebab', () => {
    expect(
      answersToFulfilments({ meansOfTransport: 'Road Vehicle' })[
        meansOfTransport.id
      ]
    ).toBe('road-vehicle')
  })

  it('transporterType Title Case -> kebab', () => {
    expect(
      answersToFulfilments({ transporterType: 'Commercial' })[
        transporterType.id
      ]
    ).toBe('commercial')
  })

  it('portOfEntry GB-prefixed -> bare code', () => {
    expect(
      answersToFulfilments({ portOfEntry: 'GB ABD' })[portOfEntry.id]
    ).toBe('ABD')
  })

  it('pass-through fields are untouched', () => {
    const answers = {
      purposeInInternalMarket: 'breeding',
      animalsCertifiedFor: 'slaughter',
      transitedCountries: ['FR', 'BE'],
      commodityLines: [{ speciesSelection: ['1148346'] }]
    }
    const fulfilments = answersToFulfilments(answers)
    expect(fulfilments[purposeInInternalMarket.id]).toBe('breeding')
    expect(fulfilments[animalsCertifiedFor.id]).toBe('slaughter')
    expect(fulfilments[transitedCountries.id]).toEqual(['FR', 'BE'])
    expect(fulfilments[species.id]).toEqual({ line0: ['1148346'] })
  })

  it('every divergent field round-trips its vocabulary', () => {
    const answers = {
      reasonForImport: 'temporaryAdmissionHorses',
      meansOfTransport: 'Road Vehicle',
      transporterType: 'Private',
      portOfEntry: 'GB DVR'
    }
    expect(fulfilmentsToAnswers(answersToFulfilments(answers))).toEqual(answers)
  })
})

// ---------------------------------------------------------------------------
// Non-injective commodity — the sharpest risk. A -> B is safe; B -> A cannot
// recover Cat vs Dog from the shared code 01061900.
// ---------------------------------------------------------------------------

describe('non-injective commodity (Cat/Dog -> 01061900)', () => {
  it('injective commodities round-trip exactly', () => {
    for (const name of ['Cow', 'Horse', 'Fish', 'Cat']) {
      const answers = { commodityLines: [{ commoditySelection: name }] }
      expect(fulfilmentsToAnswers(answersToFulfilments(answers))).toEqual(
        answers
      )
    }
  })

  it('KNOWN LIMITATION: Dog round-trips to Cat — the shared code cannot recover the name', () => {
    const dog = { commodityLines: [{ commoditySelection: 'Dog' }] }
    // A -> B is deterministic and correct: both map to the shared CN code.
    expect(answersToFulfilments(dog)[commodityCode.id]).toEqual({
      line0: '01061900'
    })
    // B -> A recovers the representative name (Cat), NOT Dog. Surfaced here,
    // never a silent pass — DESIGN-DELTA §7.
    expect(fulfilmentsToAnswers(answersToFulfilments(dog))).toEqual({
      commodityLines: [{ commoditySelection: 'Cat' }]
    })
  })
})

// ---------------------------------------------------------------------------
// Accompanying documents — A's repeatable collection <-> B's `documents`
// collection. inc-016b resolved D1: B now models the same nested topology,
// so documents bridges as an ordinary A-collection <-> B-collection
// mapping (like commodityLines) — the D1 cap-at-one is gone.
// ---------------------------------------------------------------------------

describe('accompanying documents topology (A collection <-> B collection, D1 resolved inc-016b)', () => {
  const answers = {
    documents: [
      {
        accompanyingDocumentType: 'ITAHC',
        accompanyingDocumentAttachmentType: 'PDF',
        accompanyingDocumentReference: 'GBHC1234567890',
        accompanyingDocumentDateOfIssue: {
          day: '12',
          month: '12',
          year: '2025'
        },
        filename: 'itahc-certificate.pdf'
      },
      { accompanyingDocumentType: 'OTHER' }
    ]
  }

  it('maps each document field to a records-map keyed by document instance', () => {
    const fulfilments = answersToFulfilments(answers)
    expect(fulfilments[accompanyingDocumentType.id]).toEqual({
      line0: 'ITAHC',
      line1: 'OTHER'
    })
    expect(fulfilments[accompanyingDocumentAttachmentType.id]).toEqual({
      line0: 'PDF'
    })
    expect(fulfilments[accompanyingDocumentReference.id]).toEqual({
      line0: 'GBHC1234567890'
    })
    expect(fulfilments[accompanyingDocumentDateOfIssue.id]).toEqual({
      line0: { day: '12', month: '12', year: '2025' }
    })
  })

  it('round-trips a MULTI-document journey A->B->A (D1 cap removed) and drops A-only filename', () => {
    const recovered = fulfilmentsToAnswers(answersToFulfilments(answers))
    expect(recovered.documents).toHaveLength(2)
    expect(recovered.documents[0]).toEqual({
      accompanyingDocumentType: 'ITAHC',
      accompanyingDocumentAttachmentType: 'PDF',
      accompanyingDocumentReference: 'GBHC1234567890',
      accompanyingDocumentDateOfIssue: { day: '12', month: '12', year: '2025' }
    })
    expect(recovered.documents[1]).toEqual({
      accompanyingDocumentType: 'OTHER'
    })
    expect(recovered.documents[0].filename).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// B-evaluator smoke — the first time A's data meets B's engine. Proves the
// bridge output is shaped the way B's evaluator wants and drives real gates.
// ---------------------------------------------------------------------------

describe('B evaluator smoke — A happy-path produces real implications', () => {
  const evaluator = createObligationEvaluator()
  const fulfilments = answersToFulfilments(happyPath)
  const result = evaluator.evaluate(fulfilments)

  it('the commodity name normalised to the CN code the gates compare', () => {
    expect(fulfilments[commodityCode.id]).toEqual({ line0: '0102' })
  })

  it('commodity-gated notification obligations fire (cph mandatory)', () => {
    expect(result.obligations[cph.id].status).toBe('mandatory')
  })

  it('per-line and per-unit gates fire (packages + earTag in scope)', () => {
    expect(
      result.obligations[numberOfPackages.id].records.map((r) => r.fulfilmentId)
    ).toEqual(['line0'])
    expect(
      result.obligations[earTag.id].records.map((r) => r.fulfilmentId)
    ).toContain('line0/unit0')
  })

  it('value-gated notification obligations fire (internal-market, land transport)', () => {
    expect(result.obligations[purposeInInternalMarket.id].status).toBe(
      'mandatory'
    )
    expect(result.obligations[transitedCountries.id].status).toBe('optional')
  })

  it('mutually-exclusive transporter gate resolves (commercial in, private out)', () => {
    expect(result.obligations[commercialTransporter.id].inScope).toBe(true)
    expect(result.obligations[privateTransporter.id]).toEqual({
      inScope: false
    })
  })

  it('group instances are inferred from the composite keys', () => {
    expect(
      result.obligations[commodityLine.id].records.map((r) => r.fulfilmentId)
    ).toEqual(['line0'])
    expect(
      result.obligations[unitRecord.id].records.map((r) => r.fulfilmentId)
    ).toEqual(['line0/unit0'])
  })

  it('the conditional region gate is mandatory when required', () => {
    expect(result.obligations[regionCode.id]).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [
        {
          code: 'obligation.regionCode.mandatory.becauseRegionCodeRequired',
          explanation:
            'regionCode is mandatory when regionCodeRequirement is yes'
        }
      ]
    })
  })
})
