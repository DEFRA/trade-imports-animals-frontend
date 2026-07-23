import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { assembleFulfilments } from './assemble-fulfilments.js'
import { feature, scalar } from './fulfilment-bindings.js'
import { characterisationCorpus } from './fixtures/characterisation-corpus.js'
import { countryOfOrigin } from '../model/obligations/obligations.js'

const oracles = JSON.parse(
  readFileSync(
    new URL('./fixtures/characterisation-oracles.json', import.meta.url)
  )
)

describe('increment 5 feature-assembly golden equivalence', () => {
  test.each(characterisationCorpus)(
    'Should remain byte-identical to the pre-build golden for $name',
    ({ name, answers }) => {
      const featureFulfilments = assembleFulfilments(answers)

      expect(featureFulfilments).toEqual(oracles[name].fulfilments)
      expect(JSON.stringify(featureFulfilments)).toBe(
        JSON.stringify(oracles[name].fulfilments)
      )
    }
  )

  test('Should reject duplicate UUID contributions while merging features', () => {
    const duplicateBinding = scalar({
      field: 'countryOfOrigin',
      obligation: countryOfOrigin
    })
    const registry = {
      features: [
        feature('first', [duplicateBinding]),
        feature('second', [duplicateBinding])
      ],
      leaves: [countryOfOrigin]
    }

    expect(() =>
      assembleFulfilments({ countryOfOrigin: 'FR' }, registry)
    ).toThrow(/Duplicate fulfilment contribution/)
  })
})
