import { describe, expect, test } from 'vitest'

import { validateStoredAnswers } from './validate-stored.js'

const unweanedLine = { commoditySelection: 'Cow' } // Cow is the unweaned commodity per stub
const nonUnweanedLine = { commoditySelection: 'Cat' }

describe('#validateStoredAnswers for additional-details', () => {
  test('Should return no errors when nothing has been stored yet', async () => {
    expect(await validateStoredAnswers({})).toEqual({})
  })

  test('Should accept the current certification catalogue', async () => {
    expect(
      await validateStoredAnswers({
        animalsCertifiedFor: 'slaughter',
        commodityLines: [nonUnweanedLine]
      })
    ).toEqual({})
  })

  test('Should surface a stored certification value the catalogue no longer offers', async () => {
    const errors = await validateStoredAnswers({
      animalsCertifiedFor: 'not-a-purpose-we-recognise',
      commodityLines: [nonUnweanedLine]
    })
    expect(errors).toHaveProperty('animalsCertifiedFor')
  })

  test('Should validate the unweaned answer when an unweaned commodity is picked', async () => {
    const errors = await validateStoredAnswers({
      animalsCertifiedFor: 'slaughter',
      containsUnweanedAnimals: 'perhaps',
      commodityLines: [unweanedLine]
    })
    expect(errors).toHaveProperty('containsUnweanedAnimals')
  })

  test('Should not surface an unweaned value when the reveal is not applicable', async () => {
    expect(
      await validateStoredAnswers({
        animalsCertifiedFor: 'slaughter',
        containsUnweanedAnimals: '',
        commodityLines: [nonUnweanedLine]
      })
    ).toEqual({})
  })
})
