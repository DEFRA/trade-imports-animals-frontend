import { describe, expect, it } from 'vitest'

import { hasAnimalCount } from './lines.js'

describe('#hasAnimalCount', () => {
  it.each([undefined, null, ''])(
    'Should not count a line whose animal count is %j',
    (numberOfAnimalsQuantity) => {
      expect(hasAnimalCount({ entry: { numberOfAnimalsQuantity } })).toBe(false)
    }
  )

  it.each(['0', '3', 3])(
    'Should count a line whose animal count is %j',
    (numberOfAnimalsQuantity) => {
      expect(hasAnimalCount({ entry: { numberOfAnimalsQuantity } })).toBe(true)
    }
  )
})
