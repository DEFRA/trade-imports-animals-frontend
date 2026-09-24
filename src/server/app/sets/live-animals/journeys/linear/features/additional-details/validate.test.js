import { describe, expect, it } from 'vitest'

import { validation } from './validate.js'

const UNWEANED_COMMODITY_LINE = { commoditySelection: 'Cow' }
const NON_UNWEANED_COMMODITY_LINE = { commoditySelection: 'Cat' }

describe('#validation for additional-details — onSubmit', () => {
  it('Should accept a valid certification with the unweaned answer when the reveal is open', async () => {
    const { errors } = await validation.onSubmit(
      { animalsCertifiedFor: 'slaughter', containsUnweanedAnimals: 'no' },
      { showUnweaned: true }
    )
    expect(errors).toEqual({})
  })

  it('Should reject a certification value the catalogue no longer offers', async () => {
    const { errors } = await validation.onSubmit(
      { animalsCertifiedFor: 'not-a-purpose', containsUnweanedAnimals: 'no' },
      { showUnweaned: true }
    )
    expect(errors).toHaveProperty('animalsCertifiedFor')
  })

  it('Should skip the unweaned rule when the reveal is closed', async () => {
    const { errors } = await validation.onSubmit(
      { animalsCertifiedFor: 'slaughter', containsUnweanedAnimals: 'anything' },
      { showUnweaned: false }
    )
    expect(errors).toEqual({})
  })
})

describe('#validation for additional-details — onStored', () => {
  it('Should return no errors for a blank stored notification', async () => {
    const { errors } = await validation.onStored({}, { storedAnswers: {} })
    expect(errors).toEqual({})
  })

  it('Should derive the reveal from stored commodity lines when the caller omits showUnweaned', async () => {
    const stored = {
      animalsCertifiedFor: 'slaughter',
      containsUnweanedAnimals: 'perhaps',
      commodityLines: [UNWEANED_COMMODITY_LINE]
    }
    const { errors } = await validation.onStored(stored, {
      storedAnswers: stored
    })
    expect(errors).toHaveProperty('containsUnweanedAnimals')
  })

  it('Should not fire the unweaned rule when no unweaned commodity is stored', async () => {
    const stored = {
      animalsCertifiedFor: 'slaughter',
      commodityLines: [NON_UNWEANED_COMMODITY_LINE]
    }
    const { errors } = await validation.onStored(stored, {
      storedAnswers: stored
    })
    expect(errors).toEqual({})
  })

  it('Should surface a certification value the catalogue no longer offers', async () => {
    const stored = {
      animalsCertifiedFor: 'not-a-purpose',
      commodityLines: [NON_UNWEANED_COMMODITY_LINE]
    }
    const { errors } = await validation.onStored(stored, {
      storedAnswers: stored
    })
    expect(errors).toHaveProperty('animalsCertifiedFor')
  })
})
