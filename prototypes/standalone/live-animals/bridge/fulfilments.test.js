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
  readFileSync(new URL('../flow/fixtures/happy-path.json', import.meta.url))
).values

const address = {
  name: 'Origin Farm',
  address: { addressLine1: '1 Farm Lane', country: 'Ireland' }
}

describe('#fulfilments — answersToFulfilments / fulfilmentsToAnswers', () => {
  // ---------------------------------------------------------------------------
  // Round-trip property — answersToFulfilments then fulfilmentsToAnswers
  // recovers the original A answers (the animal count comes back as the
  // number the model stores, pinned separately below).
  // ---------------------------------------------------------------------------

  describe('round-trip A -> B -> A recovers the original', () => {
    it('Should recover notification-level scalars on round-trip', () => {
      const answers = {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'yes',
        regionOfOriginCode: 'FR-75',
        reasonForImport: 'internalMarket',
        purposeInInternalMarket: 'breeding',
        meansOfTransport: 'ROAD_VEHICLE',
        transporterType: 'Commercial',
        portOfEntry: 'GB ABD',
        transitedCountries: ['FR', 'BE'],
        animalsCertifiedFor: 'slaughter',
        consignor: address
      }
      expect(fulfilmentsToAnswers(answersToFulfilments(answers))).toEqual(
        answers
      )
    })

    it('Should recover a multi-line, multi-unit collection on round-trip (counts as numbers)', () => {
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
      const recovered = fulfilmentsToAnswers(answersToFulfilments(answers))
      expect(recovered).toEqual({
        commodityLines: [
          { ...answers.commodityLines[0], numberOfAnimalsQuantity: 25 },
          { ...answers.commodityLines[1], numberOfAnimalsQuantity: 2 }
        ]
      })
    })

    it('Should round-trip every commodity name exactly', () => {
      for (const name of ['Cow', 'Horse', 'Fish', 'Cat', 'Dog']) {
        const answers = { commodityLines: [{ commoditySelection: name }] }
        expect(fulfilmentsToAnswers(answersToFulfilments(answers))).toEqual(
          answers
        )
      }
    })

    it('Should keep a blank scalar value on round-trip (not dropped)', () => {
      const answers = { countryOfOrigin: '' }
      expect(fulfilmentsToAnswers(answersToFulfilments(answers))).toEqual(
        answers
      )
    })
  })

  // ---------------------------------------------------------------------------
  // Shape — A positional path <-> B composite fulfilmentId, both directions.
  // ---------------------------------------------------------------------------

  describe('storage shape translation', () => {
    it('Should store a notification scalar directly under the UUID', () => {
      const fulfilments = answersToFulfilments({ countryOfOrigin: 'FR' })
      expect(fulfilments).toEqual({ [countryOfOrigin.id]: 'FR' })
      expect(fulfilmentsToAnswers(fulfilments)).toEqual({
        countryOfOrigin: 'FR'
      })
    })

    it('Should translate a depth-1 positional array to a single-segment composite (line<i>)', () => {
      const answers = {
        commodityLines: [
          { numberOfAnimalsQuantity: '10' },
          { numberOfAnimalsQuantity: '20' }
        ]
      }
      const fulfilments = answersToFulfilments(answers)
      // The count field is coerced to a NUMBER on the way in — the
      // model's recordCountEquals invariant compares it strictly against
      // a record tally — and stays a number on the way out.
      expect(fulfilments[numberOfAnimals.id]).toEqual({
        line0: 10,
        line1: 20
      })
      expect(fulfilmentsToAnswers(fulfilments)).toEqual({
        commodityLines: [
          { numberOfAnimalsQuantity: 10 },
          { numberOfAnimalsQuantity: 20 }
        ]
      })
    })

    it('Should translate a depth-2 nested array to a two-segment composite (line<i>/unit<j>)', () => {
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

    it('Should not represent an empty collection in B (documented)', () => {
      // B infers group instances from descendant storage, so a group with no
      // answered leaves is invisible — an oracle blind spot (PLAN §3, D-notes).
      expect(answersToFulfilments({ commodityLines: [] })).toEqual({})
      expect(answersToFulfilments({ commodityLines: [{}] })).toEqual({})
    })

    it('Should treat a missing scalar as absent, not null', () => {
      expect(answersToFulfilments({})).toEqual({})
      expect(fulfilmentsToAnswers({})).toEqual({})
    })
  })

  // ---------------------------------------------------------------------------
  // Stored vocabulary passes through unchanged — the manifest's gates compare
  // the same values the pages store. The animal count is the one coercion.
  // ---------------------------------------------------------------------------

  describe('stored values pass through', () => {
    it('Should store the picker name for a commodity selection', () => {
      const fulfilments = answersToFulfilments({
        commodityLines: [{ commoditySelection: 'Cow' }]
      })
      expect(fulfilments[commodityCode.id]).toEqual({ line0: 'Cow' })
    })

    it('Should store reasonForImport, transporterType and portOfEntry as the pages submit them', () => {
      const fulfilments = answersToFulfilments({
        reasonForImport: 'internalMarket',
        transporterType: 'Commercial',
        portOfEntry: 'GB ABD'
      })
      expect(fulfilments[reasonForImport.id]).toBe('internalMarket')
      expect(fulfilments[transporterType.id]).toBe('Commercial')
      expect(fulfilments[portOfEntry.id]).toBe('GB ABD')
    })

    it('Should leave every other field untouched', () => {
      const answers = {
        purposeInInternalMarket: 'breeding',
        animalsCertifiedFor: 'slaughter',
        meansOfTransport: 'ROAD_VEHICLE',
        transitedCountries: ['FR', 'BE'],
        commodityLines: [{ speciesSelection: ['1148346'] }]
      }
      const fulfilments = answersToFulfilments(answers)
      expect(fulfilments[purposeInInternalMarket.id]).toBe('breeding')
      expect(fulfilments[animalsCertifiedFor.id]).toBe('slaughter')
      expect(fulfilments[meansOfTransport.id]).toBe('ROAD_VEHICLE')
      expect(fulfilments[transitedCountries.id]).toEqual(['FR', 'BE'])
      expect(fulfilments[species.id]).toEqual({ line0: ['1148346'] })
    })

    it('Should keep an unparseable animal count raw for controller-side validation', () => {
      const fulfilments = answersToFulfilments({
        commodityLines: [{ numberOfAnimalsQuantity: 'many' }]
      })
      expect(fulfilments[numberOfAnimals.id]).toEqual({ line0: 'many' })
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

    it('Should map each document field to a records-map keyed by document instance', () => {
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

    it('Should round-trip a MULTI-document journey A->B->A (D1 cap removed) and drop the A-only filename', () => {
      const recovered = fulfilmentsToAnswers(answersToFulfilments(answers))
      expect(recovered.documents).toHaveLength(2)
      expect(recovered.documents[0]).toEqual({
        accompanyingDocumentType: 'ITAHC',
        accompanyingDocumentAttachmentType: 'PDF',
        accompanyingDocumentReference: 'GBHC1234567890',
        accompanyingDocumentDateOfIssue: {
          day: '12',
          month: '12',
          year: '2025'
        }
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

    it('Should store the commodity name the gates compare', () => {
      expect(fulfilments[commodityCode.id]).toEqual({ line0: 'Cow' })
    })

    it('Should fire commodity-gated notification obligations (cph mandatory)', () => {
      expect(result.obligations[cph.id].status).toBe('mandatory')
    })

    it('Should fire per-line and per-unit gates (packages + earTag in scope)', () => {
      expect(
        result.obligations[numberOfPackages.id].records.map(
          (r) => r.fulfilmentId
        )
      ).toEqual(['line0'])
      expect(
        result.obligations[earTag.id].records.map((r) => r.fulfilmentId)
      ).toContain('line0/unit0')
    })

    it('Should fire value-gated notification obligations (internalMarket, land transport)', () => {
      expect(result.obligations[purposeInInternalMarket.id].status).toBe(
        'mandatory'
      )
      expect(result.obligations[transitedCountries.id].status).toBe('optional')
    })

    it('Should resolve the mutually-exclusive transporter gate (commercial in, private out)', () => {
      expect(result.obligations[commercialTransporter.id].inScope).toBe(true)
      expect(result.obligations[privateTransporter.id]).toEqual({
        inScope: false
      })
    })

    it('Should infer group instances from the composite keys', () => {
      expect(
        result.obligations[commodityLine.id].records.map((r) => r.fulfilmentId)
      ).toEqual(['line0'])
      expect(
        result.obligations[unitRecord.id].records.map((r) => r.fulfilmentId)
      ).toEqual(['line0/unit0'])
    })

    it('Should make the conditional region gate mandatory when required', () => {
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
})
