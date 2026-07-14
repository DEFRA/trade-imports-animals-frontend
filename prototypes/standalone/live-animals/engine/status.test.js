import { describe, expect, it } from 'vitest'
import { FULFILLED, IN_PROGRESS, NA, NOT_STARTED, statusOf } from './status.js'

describe('#statusOf', () => {
  it('Should return NA when the section has no in-scope obligation', () => {
    expect(statusOf(['countryOfOrigin'], {}, new Set())).toBe(NA)
  })

  it('Should return NOT_STARTED when a required obligation is in scope and nothing is answered', () => {
    expect(statusOf(['commodityLines'], {}, new Set(['commodityLines']))).toBe(
      NOT_STARTED
    )
  })

  describe("collection facet parts — a subset of one collection's members", () => {
    const exceptIdentifiers = {
      collection: 'commodityLines',
      except: ['animalIdentifiers']
    }
    const onlyIdentifiers = {
      collection: 'commodityLines',
      only: ['animalIdentifiers']
    }
    const inScope = new Set(['commodityLines'])

    it('Should return NA for a facet whose collection is out of scope', () => {
      expect(statusOf([exceptIdentifiers], {}, new Set())).toBe(NA)
      expect(statusOf([onlyIdentifiers], {}, new Set())).toBe(NA)
    })

    it('Should return NOT_STARTED on both facets of an empty required collection', () => {
      expect(statusOf([exceptIdentifiers], {}, inScope)).toBe(NOT_STARTED)
      expect(statusOf([onlyIdentifiers], {}, inScope)).toBe(NOT_STARTED)
    })

    it("Should split one collection's status between its facets", () => {
      const lineOnly = {
        commodityLines: [
          {
            commoditySelection: 'Cow',
            typeSelection: 'Domestic',
            speciesSelection: ['1148346'],
            numberOfAnimalsQuantity: '25'
          }
        ]
      }
      expect(statusOf([exceptIdentifiers], lineOnly, inScope)).toBe(FULFILLED)
      expect(statusOf([onlyIdentifiers], lineOnly, inScope)).toBe(NOT_STARTED)

      const identifiersOnly = {
        commodityLines: [
          {
            commoditySelection: 'Cow',
            animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
          }
        ]
      }
      expect(statusOf([exceptIdentifiers], identifiersOnly, inScope)).toBe(
        IN_PROGRESS
      )
      expect(statusOf([onlyIdentifiers], identifiersOnly, inScope)).toBe(
        FULFILLED
      )
    })

    it('Should agree with the unfaceted collection: both facets fulfilled exactly when the whole is', () => {
      const wholeStates = [
        {},
        { commodityLines: [{ commoditySelection: 'Cow' }] },
        {
          commodityLines: [
            {
              commoditySelection: 'Cow',
              typeSelection: 'Domestic',
              speciesSelection: ['1148346'],
              numberOfAnimalsQuantity: '25',
              animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
            }
          ]
        }
      ]
      for (const answers of wholeStates) {
        const whole = statusOf(['commodityLines'], answers, inScope)
        const facets = [exceptIdentifiers, onlyIdentifiers].map((facet) =>
          statusOf([facet], answers, inScope)
        )
        expect(facets.every((status) => status === FULFILLED)).toBe(
          whole === FULFILLED
        )
      }
    })
  })
})
