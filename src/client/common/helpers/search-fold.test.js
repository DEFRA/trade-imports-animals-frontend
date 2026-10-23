import { containsTerm, matchPositions } from './search-fold.js'

const ABERDEEN_LIVESTOCK = 'Aberdeen Livestock'

describe('containsTerm', () => {
  it('finds a plain term in accented, mixed-case text', () => {
    expect(containsTerm("Côte d'Ivoire", 'cote')).toBe(true)
  })

  it('finds plain letters in accented text', () => {
    expect(containsTerm('García Livestock', 'garcia')).toBe(true)
  })

  it('finds accented letters in plain text', () => {
    expect(containsTerm('Garcia Livestock', 'GARCÍA')).toBe(true)
  })

  it('ignores the case of both', () => {
    expect(containsTerm(ABERDEEN_LIVESTOCK, 'ABERDEEN')).toBe(true)
  })

  it('ignores spaces around the term', () => {
    expect(containsTerm(ABERDEEN_LIVESTOCK, '  aberdeen ')).toBe(true)
  })

  it('is held by every text when the term is empty', () => {
    expect(containsTerm(ABERDEEN_LIVESTOCK, '   ')).toBe(true)
  })

  it('is not held when the term is absent', () => {
    expect(containsTerm(ABERDEEN_LIVESTOCK, 'garcia')).toBe(false)
  })
})

describe('matchPositions', () => {
  it('covers exactly the six letters of an accented name for a plain-letter term', () => {
    const text = 'García Livestock'

    const [position, ...others] = matchPositions(text, 'garcia')

    expect(text.slice(position.start, position.end)).toBe('García')
    expect(others).toEqual([])
  })

  it('covers an accent written as a separate mark', () => {
    const text = 'Garciá Livestock'

    const [position] = matchPositions(text, 'garcia')

    expect(text.slice(position.start, position.end)).toBe('Garciá')
  })

  it('lists each match, in order, without overlap', () => {
    const text = 'Banana'

    const matched = matchPositions(text, 'an').map(({ start, end }) =>
      text.slice(start, end)
    )

    expect(matched).toEqual(['an', 'an'])
    expect(matchPositions(text, 'an')).toEqual([
      { start: 1, end: 3 },
      { start: 3, end: 5 }
    ])
  })

  it('keeps the position of the original characters when the case differs', () => {
    expect(matchPositions('García', 'GAR')).toEqual([{ start: 0, end: 3 }])
  })

  it('finds an ampersand', () => {
    expect(matchPositions('R&D Ltd', '&')).toEqual([{ start: 1, end: 2 }])
  })

  it('gives no positions when the term is absent', () => {
    expect(matchPositions(ABERDEEN_LIVESTOCK, 'garcia')).toEqual([])
  })

  it('gives no positions for an empty term', () => {
    expect(matchPositions(ABERDEEN_LIVESTOCK, '  ')).toEqual([])
  })
})
