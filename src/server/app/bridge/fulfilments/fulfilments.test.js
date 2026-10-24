import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { assembleFulfilments } from '../assemble-fulfilments.js'
import { projectAnswers } from './index.js'
import { createObligationEvaluator } from '../../model/obligations/evaluator.js'
import { obligationSet } from '../../model/obligations/manifest.js'
const BISON_BISON = 'Bison bison'
const BOS_TAURUS = 'Bos taurus'

const {
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
  speciesLatinName,
  numberOfAnimals,
  numberOfPackages,
  cph,
  unitRecord,
  earTag,
  accompanyingDocumentType,
  accompanyingDocumentAttachmentType,
  accompanyingDocumentReference,
  accompanyingDocumentDateOfIssue,
  documentUploadId,
  documentFilename
} = obligationSet()

const happyPath = JSON.parse(
  readFileSync(
    new URL(
      '../../sets/live-animals/journeys/linear/flow/fixtures/happy-path.json',
      import.meta.url
    )
  )
).values

const address = {
  name: 'Origin Farm',
  address: { addressLine1: '1 Farm Lane', country: 'Ireland' }
}

const DOCUMENT_UPLOAD_ID = 'upload-001'
const DOCUMENT_FILENAME = 'itahc-certificate.pdf'

describe('#fulfilments — round-trip A -> B -> A recovers the original', () => {
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
    expect(projectAnswers(assembleFulfilments(answers))).toEqual(answers)
  })

  it('Should recover a multi-line, multi-unit collection on round-trip (counts as numbers)', () => {
    const answers = {
      commodityLines: [
        {
          commodityCode: '0102',
          numberOfAnimalsQuantity: '25',
          speciesLatinName: BOS_TAURUS,
          animalIdentifiers: [
            { animalIdentifierEarTag: 'A' },
            { animalIdentifierEarTag: 'B' }
          ]
        },
        {
          commodityCode: '0101',
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [{ horseName: 'Silver' }]
        }
      ]
    }
    const recovered = projectAnswers(assembleFulfilments(answers))
    expect(recovered).toEqual({
      commodityLines: [
        { ...answers.commodityLines[0], numberOfAnimalsQuantity: 25 },
        { ...answers.commodityLines[1], numberOfAnimalsQuantity: 2 }
      ]
    })
  })

  it('Should round-trip a commodity code of any length exactly', () => {
    for (const code of ['0102', '0101', '01063300', '01061900']) {
      const answers = { commodityLines: [{ commodityCode: code }] }
      expect(projectAnswers(assembleFulfilments(answers))).toEqual(answers)
    }
  })

  it('Should keep a blank scalar value on round-trip (not dropped)', () => {
    const answers = { countryOfOrigin: '' }
    expect(projectAnswers(assembleFulfilments(answers))).toEqual(answers)
  })
})

describe('#fulfilments — storage shape translation', () => {
  it('Should store a notification scalar directly under the UUID', () => {
    const fulfilments = assembleFulfilments({ countryOfOrigin: 'FR' })
    expect(fulfilments).toEqual({ [countryOfOrigin.id]: 'FR' })
    expect(projectAnswers(fulfilments)).toEqual({
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
    const fulfilments = assembleFulfilments(answers)
    expect(fulfilments[numberOfAnimals.id]).toEqual({
      line0: 10,
      line1: 20
    })
    expect(projectAnswers(fulfilments)).toEqual({
      commodityLines: [
        { numberOfAnimalsQuantity: 10 },
        { numberOfAnimalsQuantity: 20 }
      ]
    })
  })

  it('Should translate a depth-2 nested array to a two-segment composite (line<i>.unit<j>)', () => {
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
    const fulfilments = assembleFulfilments(answers)
    expect(fulfilments[earTag.id]).toEqual({
      'line0.unit0': 'first',
      'line0.unit1': 'second'
    })
    expect(projectAnswers(fulfilments)).toEqual(answers)
  })

  it('Should not represent an empty collection', () => {
    expect(assembleFulfilments({ commodityLines: [] })).toEqual({})
    expect(assembleFulfilments({ commodityLines: [{}] })).toEqual({})
  })

  it('Should treat a missing scalar as absent, not null', () => {
    expect(assembleFulfilments({})).toEqual({})
    expect(projectAnswers({})).toEqual({})
  })
})

describe('#fulfilments — page projection validation and ordering', () => {
  it.each([
    {
      name: 'deeper',
      fulfilments: {
        [commodityCode.id]: { 'line0.unit0': '0102' }
      }
    },
    {
      name: 'shallower',
      fulfilments: {
        [earTag.id]: { line0: 'UK123456789012' }
      }
    }
  ])(
    'Should reject a $name composite id than its within chain',
    ({ fulfilments }) => {
      expect(() => projectAnswers(fulfilments)).toThrow(
        /within chain requires depth/
      )
    }
  )

  it('Should reject a segment without a trailing numeric index', () => {
    expect(() =>
      projectAnswers({
        [earTag.id]: {
          'line0.unit-unknown': 'UK123456789012'
        }
      })
    ).toThrow(/trailing numeric index/)
  })

  it('Should accept out-of-order records and canonicalise arrays by numeric index', () => {
    const fulfilments = {
      [commodityCode.id]: { line1: '0102', line0: '0102' },
      [speciesLatinName.id]: { line1: BISON_BISON, line0: BOS_TAURUS },
      [earTag.id]: {
        'line1.unit1': 'bison-2',
        'line0.unit0': 'cow-1',
        'line1.unit0': 'bison-1'
      }
    }
    const before = structuredClone(fulfilments)

    expect(projectAnswers(fulfilments)).toEqual({
      commodityLines: [
        {
          commodityCode: '0102',
          speciesLatinName: BOS_TAURUS,
          animalIdentifiers: [{ animalIdentifierEarTag: 'cow-1' }]
        },
        {
          commodityCode: '0102',
          speciesLatinName: BISON_BISON,
          animalIdentifiers: [
            { animalIdentifierEarTag: 'bison-1' },
            { animalIdentifierEarTag: 'bison-2' }
          ]
        }
      ]
    })
    expect(fulfilments).toEqual(before)
  })

  it.each([
    {
      name: 'top-level collection',
      fulfilments: {
        [commodityCode.id]: { line0: '0102', line2: '0101' }
      }
    },
    {
      name: 'nested collection',
      fulfilments: {
        [commodityCode.id]: { line0: '0102' },
        [earTag.id]: {
          'line0.unit0': 'first',
          'line0.unit2': 'third'
        }
      }
    }
  ])('Should reject a sparse $name', ({ fulfilments }) => {
    expect(() => projectAnswers(fulfilments)).toThrow(/sparse indices/)
  })

  it('Should determine density across partial leaves, not per obligation records-map', () => {
    expect(
      projectAnswers({
        [commodityCode.id]: { line0: '0102' },
        [speciesLatinName.id]: { line1: BISON_BISON }
      })
    ).toEqual({
      commodityLines: [
        { commodityCode: '0102' },
        { speciesLatinName: BISON_BISON }
      ]
    })
  })
})

describe('#fulfilments — stored values pass through', () => {
  it('Should store the commodity code of a commodity line', () => {
    const fulfilments = assembleFulfilments({
      commodityLines: [{ commodityCode: '0102' }]
    })
    expect(fulfilments[commodityCode.id]).toEqual({ line0: '0102' })
  })

  it('Should store reasonForImport, transporterType and portOfEntry as the pages submit them', () => {
    const fulfilments = assembleFulfilments({
      reasonForImport: 'internalMarket',
      transporterType: 'Commercial',
      portOfEntry: 'GB ABD'
    })
    expect(fulfilments[reasonForImport.id]).toBe('internalMarket')
    expect(fulfilments[transporterType.id]).toBe('Commercial')
    expect(fulfilments[portOfEntry.id]).toBe('GB ABD')
  })

  it('Should store purpose, certification, transport, transited countries and species as given', () => {
    const answers = {
      purposeInInternalMarket: 'breeding',
      animalsCertifiedFor: 'slaughter',
      meansOfTransport: 'ROAD_VEHICLE',
      transitedCountries: ['FR', 'BE'],
      commodityLines: [{ speciesLatinName: BOS_TAURUS }]
    }
    const fulfilments = assembleFulfilments(answers)
    expect(fulfilments[purposeInInternalMarket.id]).toBe('breeding')
    expect(fulfilments[animalsCertifiedFor.id]).toBe('slaughter')
    expect(fulfilments[meansOfTransport.id]).toBe('ROAD_VEHICLE')
    expect(fulfilments[transitedCountries.id]).toEqual(['FR', 'BE'])
    expect(fulfilments[speciesLatinName.id]).toEqual({ line0: BOS_TAURUS })
  })

  it('Should keep an unparseable animal count raw for controller-side validation', () => {
    const fulfilments = assembleFulfilments({
      commodityLines: [{ numberOfAnimalsQuantity: 'many' }]
    })
    expect(fulfilments[numberOfAnimals.id]).toEqual({ line0: 'many' })
  })
})

describe('#fulfilments — accompanying documents topology (answers collection <-> model collection)', () => {
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
        uploadId: DOCUMENT_UPLOAD_ID,
        filename: DOCUMENT_FILENAME
      },
      { accompanyingDocumentType: 'OTHER' }
    ]
  }

  it('Should map each document field to a records-map keyed by document instance', () => {
    const fulfilments = assembleFulfilments(answers)
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
    expect(fulfilments[documentUploadId.id]).toEqual({
      line0: DOCUMENT_UPLOAD_ID
    })
    expect(fulfilments[documentFilename.id]).toEqual({
      line0: DOCUMENT_FILENAME
    })
  })

  it('Should round-trip uploadId and filename in a MULTI-document journey answers->fulfilments->answers', () => {
    const recovered = projectAnswers(assembleFulfilments(answers))
    expect(recovered.documents).toHaveLength(2)
    expect(recovered.documents[0]).toEqual({
      accompanyingDocumentType: 'ITAHC',
      accompanyingDocumentAttachmentType: 'PDF',
      accompanyingDocumentReference: 'GBHC1234567890',
      accompanyingDocumentDateOfIssue: {
        day: '12',
        month: '12',
        year: '2025'
      },
      uploadId: DOCUMENT_UPLOAD_ID,
      filename: DOCUMENT_FILENAME
    })
    expect(recovered.documents[1]).toEqual({
      accompanyingDocumentType: 'OTHER'
    })
  })
})

describe('#fulfilments — evaluator smoke — a happy path produces real implications', () => {
  const evaluator = createObligationEvaluator()
  const fulfilments = assembleFulfilments(happyPath)
  const result = evaluator.evaluate(fulfilments)

  it('Should store the commodity code the gates compare', () => {
    expect(fulfilments[commodityCode.id]).toEqual({ line0: '0102' })
  })

  it('Should fire commodity-gated notification obligations (cph mandatory)', () => {
    expect(result.obligations[cph.id].status).toBe('mandatory')
  })

  it('Should fire per-line and per-unit gates (packages + earTag in scope)', () => {
    expect(result.obligations[numberOfPackages.id].fulfilmentIndexes).toEqual([
      'line0'
    ])
    expect(result.obligations[earTag.id].fulfilmentIndexes).toContain(
      'line0.unit0'
    )
  })

  it('Should fire value-gated notification obligations (internalMarket, land transport)', () => {
    expect(result.obligations[purposeInInternalMarket.id].status).toBe(
      'mandatory'
    )
    expect(result.obligations[transitedCountries.id].inScope).toBe(true)
    expect(result.obligations[transitedCountries.id].status).toBe('optional')
  })

  it('Should resolve the mutually-exclusive transporter gate (commercial in, private out)', () => {
    expect(result.obligations[commercialTransporter.id].inScope).toBe(true)
    expect(result.obligations[privateTransporter.id]).toEqual({
      inScope: false
    })
  })

  it('Should infer group instances from the composite keys', () => {
    expect(result.obligations[commodityLine.id].fulfilmentIndexes).toEqual([
      'line0'
    ])
    expect(result.obligations[unitRecord.id].fulfilmentIndexes).toEqual([
      'line0.unit0'
    ])
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
