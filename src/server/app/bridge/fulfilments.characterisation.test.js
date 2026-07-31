import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { assembleFulfilments } from './assemble-fulfilments.js'
import { projectAnswers } from './fulfilments/index.js'
import { characterisationCorpus } from '../sets/live-animals/journeys/linear/fixtures/characterisation-corpus.js'
import { createObligationEvaluator } from '../model/obligations/evaluator.js'
import { obligationSet } from '../model/obligations/manifest.js'

const { earTag, obligations, purposeInInternalMarket } = obligationSet()
import {
  answersToTargetNotification,
  fulfilmentToNotification
} from '../services/persistence/records/notification-mapper/index.js'

const oracles = JSON.parse(
  readFileSync(
    new URL(
      '../sets/live-animals/journeys/linear/fixtures/characterisation-oracles.json',
      import.meta.url
    )
  )
)

const evaluator = createObligationEvaluator({ obligations })

describe('increment 0 golden boundary characterisation', () => {
  test.each(characterisationCorpus)(
    'Should preserve the current outputs for $name',
    ({ name, answers }) => {
      const oracle = oracles[name]
      const fulfilments = assembleFulfilments(answers)

      expect(fulfilments).toEqual(oracle.fulfilments)
      expect(JSON.stringify(fulfilments)).toBe(
        JSON.stringify(oracle.fulfilments)
      )

      const evaluation = evaluator.evaluate(fulfilments)
      expect(evaluation).toEqual(oracle.evaluation)
      expect(JSON.stringify(evaluation)).toBe(JSON.stringify(oracle.evaluation))

      expect(projectAnswers(fulfilments)).toEqual(oracle.answersFromFulfilments)
      expect(
        fulfilmentToNotification(fulfilments, answers.referenceNumber)
      ).toEqual(oracle.mapperA)
      expect(
        answersToTargetNotification(fulfilments, answers.referenceNumber)
      ).toEqual(oracle.mapperB)
    }
  )

  test('Should pin a gate flip purging a scalar and a nested leaf', () => {
    const open = oracles['gate-open']
    const flipped = oracles['gate-flipped']

    expect(open.evaluation.fulfilments).toHaveProperty(
      purposeInInternalMarket.id
    )
    expect(open.evaluation.fulfilments[earTag.id]).toEqual({
      'line0/unit0': 'UK123456789012'
    })
    expect(flipped.fulfilments).toHaveProperty(purposeInInternalMarket.id)
    expect(flipped.fulfilments[earTag.id]).toEqual({
      'line0/unit0': 'UK123456789012'
    })
    expect(flipped.evaluation.fulfilments).not.toHaveProperty(
      purposeInInternalMarket.id
    )
    expect(flipped.evaluation.fulfilments).not.toHaveProperty(earTag.id)
  })
})
