import { welshResultsAvailable } from './welsh-results-available.js'

describe('welshResultsAvailable', () => {
  it('announces one result in the singular', () => {
    expect(welshResultsAvailable(1)).toBe('1 canlyniad ar gael')
  })

  it('announces several results with o and the plural', () => {
    expect(welshResultsAvailable(3)).toBe('3 o ganlyniadau ar gael')
  })

  it('announces no results with o and the plural', () => {
    expect(welshResultsAvailable(0)).toBe('0 o ganlyniadau ar gael')
  })
})
