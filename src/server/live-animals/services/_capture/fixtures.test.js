import { describe, expect, it } from 'vitest'

import { countriesOrigin, portsOfEntry } from './fixtures.js'

describe('#captured reference fixtures', () => {
  it('Should load countries-origin as { code, name } entries', () => {
    expect(countriesOrigin).toContainEqual({ code: 'AT', name: 'Austria' })
  })

  it('Should load ports-of-entry as { code, name } entries', () => {
    expect(portsOfEntry).toContainEqual({
      code: 'GB ABD',
      name: 'Aberdeen Harbour'
    })
  })
})
