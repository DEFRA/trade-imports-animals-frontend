import { describe, expect, it } from 'vitest'

import {
  childrenOf,
  classApplicableSpecies,
  classLabelFor,
  classesFor,
  commodityCodes,
  commodityTree,
  descriptionFor,
  genusAndSpeciesFor,
  hasVarietyAndClass,
  isCommodityCode,
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

  it('provides CIDAC variety and class reference data', () => {
    expect(varietiesFor('CIDAC')).toContainEqual({ id: 'NONE', label: 'None' })
    expect(classesFor('CIDAC')).toEqual(['CLASS_I', 'CLASS_II', 'EXTRA_CLASS'])
    expect(classLabelFor('EXTRA_CLASS')).toBe('Extra Class')
    expect(classApplicableSpecies()).toEqual(['CIDAC'])
  })

  it('provides one real multi-variety species with stable IDs', () => {
    const varieties = varietiesFor('MABSD')

    expect(varieties.length).toBeGreaterThan(1)
    expect(varieties.every(({ id, label }) => id !== label)).toBe(true)
    expect(varietyLabelFor('MABSD', varieties[0].id)).toBe('McIntosh Red')
  })

  it('gates variety and class tables when both lists are available', () => {
    expect(hasVarietyAndClass('CIDAC')).toBe(true)
    expect(hasVarietyAndClass('MABSD')).toBe(false)
    expect(hasVarietyAndClass('UNKNOWN')).toBe(false)
  })

  it('returns empty or undefined values for unknown reference keys', () => {
    expect(childrenOf('UNKNOWN')).toEqual([])
    expect(speciesFor('UNKNOWN')).toEqual([])
    expect(varietiesFor('UNKNOWN')).toEqual([])
    expect(classesFor('UNKNOWN')).toEqual([])
    expect(descriptionFor('UNKNOWN')).toBeUndefined()
    expect(genusAndSpeciesFor('UNKNOWN')).toBeUndefined()
    expect(varietyLabelFor('UNKNOWN', 'UNKNOWN')).toBeUndefined()
    expect(classLabelFor('UNKNOWN')).toBeUndefined()
    expect(isCommodityCode('UNKNOWN')).toBe(false)
    expect(isSpeciesOf('UNKNOWN', 'UNKNOWN')).toBe(false)
    expect(() => searchSpecies()).not.toThrow()
  })
})
