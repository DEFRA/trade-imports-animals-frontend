import { describe, expect, it } from 'vitest'

import { missingSpecies } from './species-check.js'

// The suite runs in stub mode, so the check reads the saved TST data.
describe('#missingSpecies', () => {
  it('Should return the lines whose species is not listed under their code', async () => {
    expect(
      await missingSpecies([
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
    expect(await missingSpecies([])).toEqual([])
  })
})
