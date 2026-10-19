import { describe, expect, it } from 'vitest'

import { matchesCode, matchesWords, searchCommodities } from './stub.js'

const BOS_TAURUS = 'Bos taurus'

describe('#matchesWords', () => {
  it('Should match any word of the text on its opening characters', () => {
    expect(matchesWords(BOS_TAURUS, 'tau')).toBe(true)
    expect(matchesWords(BOS_TAURUS, 'bos')).toBe(true)
    expect(matchesWords(BOS_TAURUS, 'aurus')).toBe(false)
  })

  it('Should ignore case and punctuation', () => {
    expect(matchesWords('Bos sp.', 'SP')).toBe(true)
    expect(matchesWords('Bos sp.', 'bos,sp')).toBe(true)
    expect(matchesWords(BOS_TAURUS, 'Bos-tau')).toBe(true)
  })

  it('Should match several words only where they run in order', () => {
    expect(matchesWords('Mustela putorius furo', 'putorius fur')).toBe(true)
    expect(matchesWords('Mustela putorius furo', 'furo putorius')).toBe(false)
  })

  it('Should match nothing on an empty term or text', () => {
    expect(matchesWords(BOS_TAURUS, '   ')).toBe(false)
    expect(matchesWords(null, 'bos')).toBe(false)
  })
})

describe('#matchesCode', () => {
  it('Should match a code on its leading digits', () => {
    expect(matchesCode('01061900', '0106')).toBe(true)
    expect(matchesCode('01061900', '1900')).toBe(false)
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
})
