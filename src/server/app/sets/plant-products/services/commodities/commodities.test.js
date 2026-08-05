import { describe, expect, it } from 'vitest'

import { SPECIES_BY_CODE } from './fixture.js'
import {
  childrenOf,
  classApplicableCommodities,
  classLabelFor,
  classesFor,
  commodityCodes,
  commodityTree,
  descriptionFor,
  genusAndSpeciesFor,
  hasVarieties,
  isCommodityCode,
  isPlantsForPlanting,
  isSpeciesOf,
  searchSpecies,
  speciesFor,
  varietiesFor,
  varietyLabelFor
} from './index.js'

describe('plant-products commodity reference data', () => {
  it('provides the 11 trace-observed chapters in order', () => {
    expect(commodityTree().map(({ code }) => code)).toEqual([
      '06',
      '07',
      '08',
      '09',
      '10',
      '12',
      '14',
      '25',
      '38',
      '84',
      '87'
    ])
  })

  it('provides the real-service leaf set and commodity lookups', () => {
    const codes = commodityCodes()

    expect(codes).toEqual([
      '06011010',
      '0603197090',
      '06042090',
      '0713500010',
      '08059000',
      '0808108010',
      '0808108090',
      '09103000',
      '10083000',
      '14019000',
      '84321000',
      '87019510'
    ])
    expect(codes.every(isCommodityCode)).toBe(true)
    expect(descriptionFor('06011010')).toBe('Hyacinths')
  })

  it('returns root chapters and chapter children', () => {
    expect(childrenOf()).toBe(commodityTree())
    expect(childrenOf('06').map(({ code }) => code)).toEqual([
      '06011010',
      '0603197090',
      '06042090'
    ])
  })

  it('identifies only fixture commodities that are plants for planting', () => {
    expect(isPlantsForPlanting('06011010')).toBe(true)
    expect(isPlantsForPlanting('06042090')).toBe(false)
    expect(isPlantsForPlanting('FORGED')).toBe(false)
  })

  it('returns plant and machinery species by commodity code', () => {
    expect(speciesFor('08059000')).toContainEqual({
      eppoCode: 'CIDAC',
      genusAndSpecies: 'Citrus australasica',
      speciesId: '1364882'
    })
    expect(speciesFor('84321000')).toEqual([
      {
        eppoCode: 'NNNXX',
        genusAndSpecies: 'no plants',
        speciesId: '1435652'
      }
    ])
    expect(isSpeciesOf('08059000', 'CIDAC')).toBe(true)
  })

  it('provides three distinct cider-apple species in stable source order', () => {
    const species = speciesFor('0808108010')

    expect(species).toBe(SPECIES_BY_CODE['0808108010'])
    expect(species).toEqual([
      {
        eppoCode: 'MABAN',
        genusAndSpecies: 'Malus angustifolia',
        speciesId: '1319830'
      },
      {
        eppoCode: 'MABSD',
        genusAndSpecies: 'Malus domestica',
        speciesId: '1391442'
      },
      {
        eppoCode: 'MABZU',
        genusAndSpecies: 'Malus x zumi',
        speciesId: '1327015'
      }
    ])
    expect(species).toHaveLength(3)
    expect(new Set(species.map(({ eppoCode }) => eppoCode)).size).toBe(3)
    expect(species.map(({ eppoCode }) => eppoCode)).toEqual([
      'MABAN',
      'MABSD',
      'MABZU'
    ])
  })

  it('provides the real MABSD species for the added apple commodity', () => {
    const species = speciesFor('0808108090')

    expect(species).toBe(SPECIES_BY_CODE['0808108090'])
    expect(species).toEqual([
      {
        eppoCode: 'MABSD',
        genusAndSpecies: 'Malus domestica',
        speciesId: '1391442'
      }
    ])
  })

  it('searches genus and EPPO code as one combined filter', () => {
    expect(searchSpecies({ genus: 'citrus' })).toContainEqual({
      commodityCode: '08059000',
      eppoCode: 'CIDAC',
      genusAndSpecies: 'Citrus australasica',
      speciesId: '1364882'
    })
    expect(searchSpecies({ eppoCode: 'cid' })).toHaveLength(1)
    expect(searchSpecies({ genus: 'CITRUS', eppoCode: 'CIDAC' })).toHaveLength(
      1
    )
    expect(searchSpecies({ genus: 'malus', eppoCode: 'CIDAC' })).toEqual([])
  })

  it('provides corrected commodity-scoped CIDAC variety data without classes', () => {
    expect(varietiesFor('08059000', 'CIDAC')).toEqual([
      {
        id: 'C5E27C5A-D13B-E9F5-B4B0-7234A7941208',
        label: 'None'
      }
    ])
    expect(classesFor('08059000')).toEqual([])
    expect(classLabelFor('EXTRA_CLASS')).toBe('Extra Class')
  })

  it('provides the curated MABSD varieties and classes only for their commodity', () => {
    const varieties = varietiesFor('0808108090', 'MABSD')

    expect(varieties).toEqual([
      {
        id: '03107EFA-9BCD-1089-565E-B28F73994DEC',
        label: 'McIntosh Red'
      },
      {
        id: '035ECF9F-7B6C-078D-60D5-D2947C23A366',
        label: 'Spartan'
      },
      {
        id: '0C245190-A316-5B88-F38E-360FBBFB208F',
        label: 'Royal Gala'
      }
    ])
    expect(varieties.every(({ id, label }) => id !== label)).toBe(true)
    expect(varietyLabelFor('0808108090', 'MABSD', varieties[0].id)).toBe(
      'McIntosh Red'
    )
    expect(classesFor('0808108090')).toEqual([
      'CLASS_I',
      'CLASS_II',
      'EXTRA_CLASS'
    ])
    expect(classApplicableCommodities()).toEqual(['0808108090'])
    expect(varietiesFor('0808108010', 'MABSD')).toEqual([])
  })

  it('gates the variety page when varieties are available', () => {
    expect(hasVarieties('08059000', 'CIDAC')).toBe(true)
    expect(hasVarieties('0808108090', 'MABSD')).toBe(true)
    expect(hasVarieties('0808108010', 'MABSD')).toBe(false)
    expect(hasVarieties('UNKNOWN', 'UNKNOWN')).toBe(false)
  })

  it('returns empty or undefined values for unknown reference keys', () => {
    expect(childrenOf('UNKNOWN')).toEqual([])
    expect(speciesFor('UNKNOWN')).toEqual([])
    expect(varietiesFor('UNKNOWN', 'UNKNOWN')).toEqual([])
    expect(classesFor('UNKNOWN')).toEqual([])
    expect(descriptionFor('UNKNOWN')).toBeUndefined()
    expect(genusAndSpeciesFor('UNKNOWN')).toBeUndefined()
    expect(varietyLabelFor('UNKNOWN', 'UNKNOWN', 'UNKNOWN')).toBeUndefined()
    expect(classLabelFor('UNKNOWN')).toBeUndefined()
    expect(isCommodityCode('UNKNOWN')).toBe(false)
    expect(isSpeciesOf('UNKNOWN', 'UNKNOWN')).toBe(false)
    expect(() => searchSpecies()).not.toThrow()
  })
})
