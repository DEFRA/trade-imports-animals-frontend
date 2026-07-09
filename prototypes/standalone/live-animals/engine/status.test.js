import { describe, expect, it } from 'vitest'
import { NA, NOT_STARTED, statusOf } from './status.js'

describe('#statusOf', () => {
  it('Should return NA when the section has no in-scope obligation', () => {
    expect(statusOf(['countryOfOrigin'], {}, new Set())).toBe(NA)
  })

  it('Should return NOT_STARTED when a required obligation is in scope and nothing is answered', () => {
    expect(statusOf(['commodityLines'], {}, new Set(['commodityLines']))).toBe(
      NOT_STARTED
    )
  })
})
