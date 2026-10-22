import { describe, expect, it } from 'vitest'

import {
  MIN_SEARCH_LENGTH,
  codeMatchRanges,
  isSearchable,
  matchesCode,
  matchesWords,
  normaliseQuery,
  wordMatchRanges
} from './matching.js'

const BOS_TAURUS = 'Bos taurus'
const CANIS_LUPUS_FAMILIARIS = 'Canis lupus familiaris'

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
    expect(matchesWords(CANIS_LUPUS_FAMILIARIS, 'lupus fam')).toBe(true)
    expect(matchesWords(CANIS_LUPUS_FAMILIARIS, 'fam lupus')).toBe(false)
  })

  it('Should match nothing on an empty query', () => {
    expect(matchesWords(BOS_TAURUS, '   ')).toBe(false)
  })
})

describe('#wordMatchRanges', () => {
  it('Should give the typed opening characters of the word that matched', () => {
    expect(wordMatchRanges(BOS_TAURUS, 'tau')).toEqual([{ start: 4, end: 7 }])
  })

  it('Should give one range per word of a run, skipping the punctuation between them', () => {
    expect(wordMatchRanges(CANIS_LUPUS_FAMILIARIS, 'lupus-fam')).toEqual([
      { start: 6, end: 11 },
      { start: 12, end: 15 }
    ])
  })

  it('Should give every place the query matches', () => {
    expect(wordMatchRanges('Bison bison', 'bis')).toEqual([
      { start: 0, end: 3 },
      { start: 6, end: 9 }
    ])
  })

  it('Should give no range when the query does not match', () => {
    expect(wordMatchRanges(BOS_TAURUS, 'aurus')).toEqual([])
    expect(wordMatchRanges(BOS_TAURUS, '   ')).toEqual([])
  })
})

describe('#matchesCode', () => {
  it('Should match a commodity code on its leading digits', () => {
    expect(matchesCode('01061900', '0106')).toBe(true)
    expect(matchesCode('01061900', '1900')).toBe(false)
  })
})

describe('#codeMatchRanges', () => {
  it('Should give the leading digits the query matched', () => {
    expect(codeMatchRanges('01061900', ' 0106 ')).toEqual([
      { start: 0, end: 4 }
    ])
  })

  it('Should give no range when the code does not start with the query', () => {
    expect(codeMatchRanges('01061900', '1900')).toEqual([])
    expect(codeMatchRanges('01061900', '')).toEqual([])
  })
})
