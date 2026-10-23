import { describe, expect, it } from 'vitest'

import {
  matchesCodePrefix,
  matchesWordPrefixes,
  searchCommodities
} from './stub.js'

const BOS_TAURUS = 'Bos taurus'

describe('#matchesWordPrefixes', () => {
  it('Should match any word of the text on its opening characters', () => {
    expect(matchesWordPrefixes(BOS_TAURUS, 'tau')).toBe(true)
    expect(matchesWordPrefixes(BOS_TAURUS, 'bos')).toBe(true)
    expect(matchesWordPrefixes(BOS_TAURUS, 'aurus')).toBe(false)
  })

  it('Should ignore case and punctuation', () => {
    expect(matchesWordPrefixes('Bos sp.', 'SP')).toBe(true)
    expect(matchesWordPrefixes('Bos sp.', 'bos,sp')).toBe(true)
    expect(matchesWordPrefixes(BOS_TAURUS, 'Bos-tau')).toBe(true)
  })

  it('Should match several words only where they run in order', () => {
    expect(matchesWordPrefixes('Mustela putorius furo', 'putorius fur')).toBe(
      true
    )
    expect(matchesWordPrefixes('Mustela putorius furo', 'furo putorius')).toBe(
      false
    )
  })

  it('Should match nothing on an empty term or text', () => {
    expect(matchesWordPrefixes(BOS_TAURUS, '   ')).toBe(false)
    expect(matchesWordPrefixes(null, 'bos')).toBe(false)
  })
})

describe('#matchesCodePrefix', () => {
  it('Should match a code on its leading digits', () => {
    expect(matchesCodePrefix('01061900', '0106')).toBe(true)
    expect(matchesCodePrefix('01061900', '1900')).toBe(false)
  })
})

describe('#searchCommodities', () => {
  it('Should group a page of matching species by code, in data order', () => {
    expect(searchCommodities('buffalo', { page: 0, size: 2 })).toEqual({
      total: 3,
      page: 0,
      size: 2,
      groups: [
        {
          code: '0102',
          species: [
            { latinName: 'Bubalus', commonName: 'water buffalos' },
            { latinName: 'Bubalus bubalis', commonName: 'Water Buffalo' }
          ]
        }
      ]
    })
  })

  it('Should give the later matches on the next page', () => {
    expect(searchCommodities('buffalo', { page: 1, size: 2 }).groups).toEqual([
      {
        code: '0102',
        species: [{ latinName: 'Syncerus', commonName: 'African Buffaloes' }]
      }
    ])
  })

  it('Should list every species of a code found by its code, a page at a time', () => {
    const firstPage = searchCommodities('0102', { page: 0, size: 10 })
    expect(firstPage.total).toBe(15)
    expect(firstPage.groups).toHaveLength(1)
    expect(firstPage.groups[0].species).toHaveLength(10)

    const secondPage = searchCommodities('0102', { page: 1, size: 10 })
    expect(secondPage.groups[0].species).toHaveLength(5)
  })

  it('Should group matches under each code they fall under, in data order', () => {
    const results = searchCommodities('taurus', { page: 0, size: 10 })
    expect(results.groups.map((group) => group.code)).toEqual([
      '0102',
      '01061900'
    ])
  })

  it('Should find nothing for a term that matches nothing', () => {
    expect(searchCommodities('unicorn', { page: 0, size: 10 })).toEqual({
      total: 0,
      page: 0,
      size: 10,
      groups: []
    })
  })
})
