import { describe, expect, it } from 'vitest'

import {
  cphExemptCommodityCodes,
  earTagCommodities,
  horseNameCommodities,
  identifiedCommodities,
  identifiersFor,
  microchipCommodities,
  passportCommodities,
  permanentAddressSpecies,
  speciesListedIndividually,
  tattooCommodities,
  typeIdFor,
  typeTextForId
} from './index.js'
import { search } from './search.js'
import { COMMODITY_GROUPS } from './stub.js'

const CATTLE = '0102'
const HORSES = '0101'
const OTHER_MAMMALS = '01061900'
const OSTRICHES = '01063300'

describe('#search', () => {
  // The suite runs in stub mode, so search reads the saved TST data.
  it('Should find a species by its common name, under its code', async () => {
    const results = await search('ferret', { size: 10 })
    expect(results).toEqual({
      total: 1,
      page: 0,
      size: 10,
      groups: [
        {
          code: OTHER_MAMMALS,
          species: [
            { latinName: 'Mustela putorius furo', commonName: 'Ferret' }
          ]
        }
      ]
    })
  })

  it('Should list every species of a code found by its code, a page at a time', async () => {
    const results = await search(CATTLE, { size: 10 })
    expect(results.total).toBe(15)
    expect(results.groups).toHaveLength(1)
    expect(results.groups[0].species).toHaveLength(10)

    const secondPage = await search(CATTLE, { page: 1, size: 10 })
    expect(secondPage.groups[0].species).toHaveLength(5)
  })

  it('Should find a species by any word of its Latin name', async () => {
    const results = await search('taurus', { size: 10 })
    expect(results.groups.map((group) => group.code)).toEqual([
      CATTLE,
      OTHER_MAMMALS
    ])
  })

  it('Should find nothing for a term that matches nothing', async () => {
    const results = await search('unicorn', { size: 10 })
    expect(results).toEqual({ total: 0, page: 0, size: 10, groups: [] })
  })
})

describe('#speciesListedIndividually', () => {
  it('Should hold for code 01061900 and for no other', () => {
    expect(speciesListedIndividually(OTHER_MAMMALS)).toBe(true)
    expect(speciesListedIndividually(CATTLE)).toBe(false)
    expect(speciesListedIndividually(HORSES)).toBe(false)
  })
})

describe('#identifiersFor', () => {
  it('Should give each code its identifiers in the order it asks for them', () => {
    expect(identifiersFor(CATTLE)).toEqual([
      'animalIdentifierEarTag',
      'animalIdentifierPassport'
    ])
    expect(identifiersFor(HORSES)).toEqual([
      'animalIdentifierMicrochip',
      'animalIdentifierPassport',
      'horseName'
    ])
    expect(identifiersFor(OTHER_MAMMALS)).toEqual([
      'animalIdentifierMicrochip',
      'animalIdentifierPassport',
      'animalIdentifierTattoo'
    ])
  })

  it('Should give no identifiers for a code that carries none', () => {
    expect(identifiersFor(OSTRICHES)).toEqual([])
    expect(identifiersFor('not-a-code')).toEqual([])
  })
})

// The per-identifier allowlists the obligation gates read are derived from the
// same per-code lists, so a code's identifiers and its gates are one edit, not
// two that can disagree.
describe('the identifier allowlists', () => {
  const derivations = [
    ['microchip', microchipCommodities, 'animalIdentifierMicrochip'],
    ['passport', passportCommodities, 'animalIdentifierPassport'],
    ['tattoo', tattooCommodities, 'animalIdentifierTattoo'],
    ['ear tag', earTagCommodities, 'animalIdentifierEarTag'],
    ['horse name', horseNameCommodities, 'horseName']
  ]

  for (const [name, allowlist, identifier] of derivations) {
    it(`Should hold exactly the codes whose own list carries the ${name}`, () => {
      for (const code of allowlist()) {
        expect(identifiersFor(code)).toContain(identifier)
      }
      expect(allowlist()).not.toContain(OSTRICHES)
    })
  }

  it('Should identify exactly the codes that carry at least one identifier', () => {
    expect([...identifiedCommodities()].sort()).toEqual([
      HORSES,
      CATTLE,
      OTHER_MAMMALS
    ])
  })

  // `permanentAddress` is mandatory inside the unitRecord group, and unit
  // records exist only on identified codes. A species asked for a permanent
  // address that sat under no identified code would collect nothing at all
  // and still read as Fulfilled.
  it('Should find every permanent-address species MDM holds under an identified code', () => {
    const codesOf = (latinName) =>
      COMMODITY_GROUPS.filter((group) =>
        group.species.some((species) => species.latinName === latinName)
      ).map((group) => group.code)

    for (const latinName of permanentAddressSpecies()) {
      for (const code of codesOf(latinName)) {
        expect(identifiedCommodities()).toContain(code)
      }
    }
    expect(codesOf('Felis catus')).toEqual([OTHER_MAMMALS])
  })
})

describe('the CPH exemption', () => {
  it('Should exempt exactly the horse and cat/dog/ferret codes', () => {
    expect([...cphExemptCommodityCodes()].sort()).toEqual([
      HORSES,
      OTHER_MAMMALS
    ])
  })
})

describe('#typeIdFor', () => {
  it('Should split cattle into Domestic and Game by species', () => {
    expect(typeIdFor(CATTLE, 'Bos taurus')).toBe('16')
    expect(typeIdFor(CATTLE, 'Bos spp.')).toBe('24')
    expect(typeTextForId(CATTLE, '16')).toBe('Domestic')
    expect(typeTextForId(CATTLE, '24')).toBe('Game')
  })

  it('Should give every other code its one type, with blank text', () => {
    expect(typeIdFor(OTHER_MAMMALS, 'Felis catus')).toBe('2')
    expect(typeTextForId(OTHER_MAMMALS, '2')).toBe('')
    expect(typeTextForId(CATTLE, '2')).toBeUndefined()
  })
})
