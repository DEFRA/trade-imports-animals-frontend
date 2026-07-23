import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { characterisationCorpus } from './fixtures/characterisation-corpus.js'
import { migrateNameKeyedAnswersToFulfilments } from './name-keyed-migration.js'

const oracles = JSON.parse(
  readFileSync(
    new URL('./fixtures/characterisation-oracles.json', import.meta.url)
  )
)

describe('increment 4 name-keyed write migration facade', () => {
  test.each(characterisationCorpus)(
    'Should remain byte-equivalent to the golden fulfilment for $name',
    ({ name, answers }) => {
      const migrated = migrateNameKeyedAnswersToFulfilments(answers)

      expect(migrated).toEqual(oracles[name].fulfilments)
      expect(JSON.stringify(migrated)).toBe(
        JSON.stringify(oracles[name].fulfilments)
      )
    }
  )
})
