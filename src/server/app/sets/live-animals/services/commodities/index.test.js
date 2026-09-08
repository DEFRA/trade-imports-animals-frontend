import { describe, expect, it } from 'vitest'

import {
  earTagCommodities,
  horseNameCommodities,
  identifiersFor,
  microchipCommodities,
  passportCommodities,
  speciesCommonName,
  speciesListedIndividually,
  tattooCommodities
} from './index.js'

const NOT_A_COMMODITY = 'not-a-commodity'

describe('#speciesCommonName', () => {
  it("Should give the species' own common name", () => {
    expect(speciesCommonName('Cow', '1148346')).toBe('Domestic cattle')
    expect(speciesCommonName('Cow', '716661')).toBe('American bison')
  })

  it('Should fall back to the commodity name where the catalogue holds no common name for the species', () => {
    expect(speciesCommonName('Cow', 'not-in-the-catalogue')).toBe('Cow')
    expect(speciesCommonName(NOT_A_COMMODITY, '1148346')).toBe(NOT_A_COMMODITY)
  })
})

describe('#speciesListedIndividually', () => {
  it('Should hold for the commodities on code 01061900 and for no others', () => {
    expect(speciesListedIndividually('Cat')).toBe(true)
    expect(speciesListedIndividually('Dog')).toBe(true)
    expect(speciesListedIndividually('Cow')).toBe(false)
    expect(speciesListedIndividually('Horse')).toBe(false)
    expect(speciesListedIndividually('Fish')).toBe(false)
    expect(speciesListedIndividually(NOT_A_COMMODITY)).toBe(false)
  })
})

describe('#identifiersFor', () => {
  // Design release 1 asks for each commodity's identifiers in that
  // commodity's own order — the ear tag first on a cow, the microchip first
  // on a horse — so the order is data on the commodity, not one running order
  // the service applies to every animal.
  it('Should give each commodity its identifiers in the order it asks for them', () => {
    expect(identifiersFor('Cow')).toEqual([
      'animalIdentifierEarTag',
      'animalIdentifierPassport',
      'animalIdentifierTattoo'
    ])
    expect(identifiersFor('Horse')).toEqual([
      'animalIdentifierMicrochip',
      'animalIdentifierPassport',
      'horseName'
    ])
    expect(identifiersFor('Cat')).toEqual([
      'animalIdentifierMicrochip',
      'animalIdentifierPassport',
      'animalIdentifierTattoo'
    ])
  })

  it('Should give no identifiers for a commodity that carries none, or is not a commodity at all', () => {
    expect(identifiersFor('Fish')).toEqual([])
    expect(identifiersFor(NOT_A_COMMODITY)).toEqual([])
  })
})

// The per-identifier allowlists the obligation gates read are derived from the
// same per-commodity lists, so a commodity's identifiers and its gates are one
// edit, not two that can disagree.
describe('the identifier allowlists', () => {
  const derivations = [
    ['microchip', microchipCommodities, 'animalIdentifierMicrochip'],
    ['passport', passportCommodities, 'animalIdentifierPassport'],
    ['tattoo', tattooCommodities, 'animalIdentifierTattoo'],
    ['ear tag', earTagCommodities, 'animalIdentifierEarTag'],
    ['horse name', horseNameCommodities, 'horseName']
  ]

  for (const [name, allowlist, identifier] of derivations) {
    it(`Should hold exactly the commodities whose own list carries the ${name}`, () => {
      for (const commodity of allowlist()) {
        expect(identifiersFor(commodity)).toContain(identifier)
      }
      expect(identifiersFor('Fish')).not.toContain(identifier)
    })
  }
})
