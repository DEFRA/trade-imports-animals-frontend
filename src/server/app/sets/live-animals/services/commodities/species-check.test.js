import { describe, expect, it } from 'vitest'

import { linesWithUnlistedSpecies } from './species-check.js'

describe('#linesWithUnlistedSpecies', () => {
  it('Should return the lines whose species is not listed under their code', async () => {
    expect(
      await linesWithUnlistedSpecies([
        { code: '0102', latinName: 'Bos taurus' },
        { code: '0102', latinName: 'Bos spp.' },
        { code: '0101', latinName: 'Felis catus' }
      ])
    ).toEqual([
      { code: '0102', latinName: 'Bos spp.' },
      { code: '0101', latinName: 'Felis catus' }
    ])
  })

  it('Should return nothing when there is nothing to check', async () => {
    expect(await linesWithUnlistedSpecies([])).toEqual([])
  })
})
