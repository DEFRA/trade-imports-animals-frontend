import { describe, expect, it } from 'vitest'

import {
  MIN_SEARCH_LENGTH,
  isSearchable,
  matchesCode,
  matchesWords,
  normaliseQuery
} from './matching.js'

const BOS_TAURUS = 'Bos taurus'

describe('#normaliseQuery', () => {
  it('Should trim what the trader typed and treat nothing as empty', () => {
    expect(normaliseQuery('  Bos taurus ')).toBe(BOS_TAURUS)
    expect(normaliseQuery(undefined)).toBe('')
    expect(normaliseQuery(null)).toBe('')
  })
})

describe('#isSearchable', () => {
  it('Should hold results back until three characters are entered', () => {
    expect(MIN_SEARCH_LENGTH).toBe(3)
    expect(isSearchable('Bo')).toBe(false)
    expect(isSearchable('  Bo  ')).toBe(false)
    expect(isSearchable('Bos')).toBe(true)
  })
})

describe('#matchesWords', () => {
  it('Should match any word of the text on its opening characters', () => {
    expect(matchesWords(BOS_TAURUS, 'tau')).toBe(true)
    expect(matchesWords(BOS_TAURUS, 'bos')).toBe(true)
    expect(matchesWords(BOS_TAURUS, 'aurus')).toBe(false)
  })

  it('Should ignore case and punctuation', () => {
    expect(matchesWords('Bos spp.', 'SPP')).toBe(true)
    expect(matchesWords('Bos spp.', 'bos,spp')).toBe(true)
    expect(matchesWords(BOS_TAURUS, 'Bos-tau')).toBe(true)
  })

  it('Should match several words only where they run in order', () => {
    expect(matchesWords('Canis lupus familiaris', 'lupus fam')).toBe(true)
    expect(matchesWords('Canis lupus familiaris', 'fam lupus')).toBe(false)
  })

  it('Should match nothing on an empty query', () => {
    expect(matchesWords(BOS_TAURUS, '   ')).toBe(false)
  })
})

describe('#matchesCode', () => {
  it('Should match a commodity code on its leading digits', () => {
    expect(matchesCode('01061900', '0106')).toBe(true)
    expect(matchesCode('01061900', '1900')).toBe(false)
  })
})
