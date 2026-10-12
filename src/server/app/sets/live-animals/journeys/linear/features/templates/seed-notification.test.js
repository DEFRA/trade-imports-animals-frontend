import { describe, expect, it } from 'vitest'

import {
  accompanyingDocumentType,
  animalsCertifiedFor,
  arrivalDateAtPort,
  commodityCode,
  containsUnweanedAnimals,
  countryOfOrigin,
  cph,
  documents,
  documentUploadId,
  internalReferenceNumber,
  meansOfTransport,
  numberOfAnimals,
  portOfEntry,
  purposeInInternalMarket,
  reasonForImport,
  regionCode,
  regionCodeRequirement,
  transporterType
} from '../../../../obligations/index.js'
import { notificationSeedFrom } from './seed-notification.js'

const LINE = 'line-1'
const UNWEANED_COMMODITY = 'Cow'
const OTHER_COMMODITY = 'Horse'

const withLine = (commodity, fulfilment = {}) => ({
  [commodityCode.id]: { [LINE]: commodity },
  [numberOfAnimals.id]: { [LINE]: '3' },
  ...fulfilment
})

describe('notificationSeedFrom', () => {
  it('Should carry every held answer the template holds unchanged', () => {
    const held = withLine(OTHER_COMMODITY, {
      [countryOfOrigin.id]: 'FR',
      [regionCodeRequirement.id]: 'yes',
      [regionCode.id]: 'FR-75',
      [internalReferenceNumber.id]: 'REF-1',
      [reasonForImport.id]: 'internalMarket',
      [purposeInInternalMarket.id]: 'breeding',
      [animalsCertifiedFor.id]: 'slaughter',
      [cph.id]: '12/345/6789',
      [portOfEntry.id]: 'GBDVR1',
      [meansOfTransport.id]: 'road',
      [transporterType.id]: 'commercial'
    })

    expect(notificationSeedFrom(held)).toEqual(held)
  })

  it('Should never carry an arrival date or any document', () => {
    const held = withLine(OTHER_COMMODITY, {
      [arrivalDateAtPort.id]: '2026-10-12',
      [documents.id]: [LINE],
      [accompanyingDocumentType.id]: { [LINE]: '1' },
      [documentUploadId.id]: { [LINE]: 'upload-1' },
      [animalsCertifiedFor.id]: 'slaughter'
    })

    const seed = notificationSeedFrom(held)

    expect(seed).not.toHaveProperty(arrivalDateAtPort.id)
    expect(seed).not.toHaveProperty(documents.id)
    expect(seed).not.toHaveProperty(accompanyingDocumentType.id)
    expect(seed).not.toHaveProperty(documentUploadId.id)
    expect(seed[commodityCode.id]).toEqual({ [LINE]: OTHER_COMMODITY })
  })

  it('Should keep Certified for when it is offered', () => {
    const seed = notificationSeedFrom(
      withLine(OTHER_COMMODITY, { [animalsCertifiedFor.id]: 'exhibition' })
    )

    expect(seed[animalsCertifiedFor.id]).toBe('exhibition')
  })

  it.each([
    ['missing', {}],
    ['no longer offered', { [animalsCertifiedFor.id]: 'retired-purpose' }]
  ])(
    'Should seed Further keeping when Certified for is %s',
    (_case, answers) => {
      const seed = notificationSeedFrom(withLine(OTHER_COMMODITY, answers))

      expect(seed[animalsCertifiedFor.id]).toBe('further-keeping')
    }
  )

  it('Should keep the unweaned answer when the commodity asks it', () => {
    const seed = notificationSeedFrom(
      withLine(UNWEANED_COMMODITY, { [containsUnweanedAnimals.id]: 'yes' })
    )

    expect(seed[containsUnweanedAnimals.id]).toBe('yes')
  })

  it('Should seed No when the commodity asks it and the template has none', () => {
    const seed = notificationSeedFrom(withLine(UNWEANED_COMMODITY))

    expect(seed[containsUnweanedAnimals.id]).toBe('no')
  })

  it('Should drop the unweaned answer when no commodity asks it', () => {
    const seed = notificationSeedFrom(
      withLine(OTHER_COMMODITY, { [containsUnweanedAnimals.id]: 'yes' })
    )

    expect(seed).not.toHaveProperty(containsUnweanedAnimals.id)
  })

  it('Should keep the purpose only when the reason is internal market', () => {
    const kept = notificationSeedFrom(
      withLine(OTHER_COMMODITY, {
        [reasonForImport.id]: 'internalMarket',
        [purposeInInternalMarket.id]: 'breeding'
      })
    )
    const dropped = notificationSeedFrom(
      withLine(OTHER_COMMODITY, {
        [reasonForImport.id]: 'transit',
        [purposeInInternalMarket.id]: 'breeding'
      })
    )

    expect(kept[purposeInInternalMarket.id]).toBe('breeding')
    expect(dropped).not.toHaveProperty(purposeInInternalMarket.id)
  })

  it("Should not change the template's answers it was given", () => {
    const held = withLine(UNWEANED_COMMODITY, {
      [arrivalDateAtPort.id]: '2026-10-12',
      [reasonForImport.id]: 'transit',
      [purposeInInternalMarket.id]: 'breeding'
    })
    const clone = structuredClone(held)

    notificationSeedFrom(held)

    expect(held).toEqual(clone)
  })
})
