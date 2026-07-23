import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { answersToFulfilments, projectAnswers } from './fulfilments.js'
import { characterisationCorpus } from './fixtures/characterisation-corpus.js'
import { createObligationEvaluator } from '../model/obligations/evaluator.js'
import {
  earTag,
  obligations,
  purposeInInternalMarket
} from '../model/obligations/obligations.js'
import {
  answersToNotification,
  answersToTargetNotification
} from '../services/persistence/records/notification-mapper.js'

const oracles = JSON.parse(
  readFileSync(
    new URL('./fixtures/characterisation-oracles.json', import.meta.url)
  )
)

const evaluator = createObligationEvaluator({ obligations })

describe('increment 0 golden boundary characterisation', () => {
  test.each(characterisationCorpus)(
    'Should preserve the current outputs for $name',
    ({ name, answers }) => {
      const oracle = oracles[name]
      const fulfilments = answersToFulfilments(answers)

      expect(fulfilments).toEqual(oracle.fulfilments)
      expect(JSON.stringify(fulfilments)).toBe(
        JSON.stringify(oracle.fulfilments)
      )

      const evaluation = evaluator.evaluate(fulfilments)
      expect(evaluation).toEqual(oracle.evaluation)
      expect(JSON.stringify(evaluation)).toBe(JSON.stringify(oracle.evaluation))

      expect(projectAnswers(fulfilments)).toEqual(oracle.answersFromFulfilments)
      expect(answersToNotification(answers)).toEqual(oracle.mapperA)
      expect(answersToTargetNotification(answers)).toEqual(oracle.mapperB)
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
