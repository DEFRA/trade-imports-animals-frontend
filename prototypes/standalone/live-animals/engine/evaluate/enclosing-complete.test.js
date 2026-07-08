import { describe, expect, it } from 'vitest'
import { registry } from '../../registry.js'
import { collectionComplete, entryComplete, satisfied } from './complete.js'
import {
  animalIdentifiers,
  commodityLines
} from '../../features/commodities/obligations.js'

const line = (commoditySelection, units) => ({
  commoditySelection,
  typeSelection: 'domestic',
  speciesSelection: ['bos-taurus'],
  numberOfAnimalsQuantity: '25',
  animalIdentifiers: units
})

const address = { name: 'Pet Owner', address: { addressLine1: '1 Farm Lane' } }

describe('enclosing-gated completeness — permanentAddress owed matches scope', () => {
  it('(a) Should NOT count permanentAddress owed on an OFF-gate unit (Horse: no Cats/Dogs gate)', () => {
    expect(
      satisfied('commodityLines', {
        commodityLines: [line('0101 - Horse', [{ horseName: 'Dobbin' }])]
      })
    ).toBe(true)
  })

  it('(b) Should count permanentAddress owed on an ON-gate unit (Cats), complete once answered', () => {
    expect(
      satisfied('commodityLines', {
        commodityLines: [
          line('01061900 - Cats', [{ animalIdentifierPassport: 'UK-1' }])
        ]
      })
    ).toBe(false)
    expect(
      satisfied('commodityLines', {
        commodityLines: [
          line('01061900 - Cats', [
            { animalIdentifierPassport: 'UK-1', permanentAddress: address }
          ])
        ]
      })
    ).toBe(true)
  })

  it('Should scope permanentAddress per unit from its OWN enclosing line, no leak between lines', () => {
    expect(
      satisfied('commodityLines', {
        commodityLines: [
          line('0101 - Horse', [{ horseName: 'Dobbin' }]),
          line('01061900 - Cats', [{ animalIdentifierPassport: 'UK-1' }])
        ]
      })
    ).toBe(false)
  })

  it('Should still enforce the requiredOneOf group on an off-gate unit', () => {
    expect(
      satisfied('commodityLines', {
        commodityLines: [line('0101 - Horse', [{}])]
      })
    ).toBe(false)
  })
})

describe('enclosing-gated completeness — depth-2 ctx built by hand', () => {
  const ctxFor = (commoditySelection) => ({
    answers: {
      commodityLines: [{ commoditySelection, animalIdentifiers: [] }]
    },
    basePath: ['commodityLines', 0, 'animalIdentifiers'],
    enclosingFrames: [
      { framePath: ['commodityLines', 0], siblings: commodityLines.item },
      { framePath: [], siblings: registry.all }
    ]
  })

  it('Should treat permanentAddress as owed on a Cats unit and satisfied when answered', () => {
    const ctx = ctxFor('01061900 - Cats')
    expect(
      collectionComplete(
        animalIdentifiers,
        [{ animalIdentifierPassport: 'UK-1' }],
        ctx
      )
    ).toBe(false)
    expect(
      collectionComplete(
        animalIdentifiers,
        [{ animalIdentifierPassport: 'UK-1', permanentAddress: address }],
        ctx
      )
    ).toBe(true)
  })

  it('Should treat permanentAddress as NOT owed on a Horse unit', () => {
    expect(
      collectionComplete(
        animalIdentifiers,
        [{ horseName: 'Dobbin' }],
        ctxFor('0101 - Horse')
      )
    ).toBe(true)
  })
})

describe('backwards compatibility — no ctx is the pre-inc-035 default', () => {
  it('Should treat a required enclosing-gated field as owed when NO ctx is given (conservative)', () => {
    expect(
      collectionComplete(animalIdentifiers, [
        { animalIdentifierPassport: 'UK-1' }
      ])
    ).toBe(false)
    expect(
      entryComplete(animalIdentifiers, {
        animalIdentifierPassport: 'UK-1',
        permanentAddress: address
      })
    ).toBe(true)
  })

  it('Should leave same-frame completeness unchanged (a required same-frame field still owed)', () => {
    const incompleteLine = {
      ...line('0101 - Horse', [{ horseName: 'Dobbin' }]),
      numberOfAnimalsQuantity: ''
    }
    expect(
      satisfied('commodityLines', { commodityLines: [incompleteLine] })
    ).toBe(false)
  })

  it('Should leave a gate-free collection (documents) unchanged under satisfied', () => {
    expect(satisfied('documents', { documents: [] })).toBe(true)
    expect(
      satisfied('documents', {
        documents: [
          {
            accompanyingDocumentType: 'ITAHC',
            accompanyingDocumentAttachmentType: 'PDF',
            accompanyingDocumentReference: 'GBHC1',
            accompanyingDocumentDateOfIssue: {
              day: '1',
              month: '1',
              year: '2025'
            }
          }
        ]
      })
    ).toBe(true)
    expect(satisfied('documents', { documents: [{}] })).toBe(false)
  })
})
