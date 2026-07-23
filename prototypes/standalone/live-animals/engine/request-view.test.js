import { describe, expect, test } from 'vitest'
import { answersToFulfilments, projectAnswers } from '../bridge/fulfilments.js'
import { characterisationCorpus } from '../bridge/fixtures/characterisation-corpus.js'
import {
  earTag,
  purposeInInternalMarket
} from '../model/obligations/obligations.js'
import {
  decodePersistedFulfilment,
  encodeEvaluatorFulfilments
} from '../services/persistence/records/fulfilment-codec.js'
import { assembleRequestView } from './request-view.js'

const canonicalViewOf = (answers) =>
  assembleRequestView(
    decodePersistedFulfilment(
      encodeEvaluatorFulfilments(answersToFulfilments(answers))
    )
  )

describe('#assembleRequestView', () => {
  test.each(characterisationCorpus)(
    'Should assemble the canonical request view for $name',
    ({ answers }) => {
      const view = canonicalViewOf(answers)

      expect(view.answers).toEqual(projectAnswers(view.evaluation.fulfilments))
      expect(view.scope.inScope).toBeInstanceOf(Set)
      expect(view.scope.has('countryOfOrigin')).toBe(
        view.scope.inScope.has('countryOfOrigin')
      )
    }
  )

  test('Should project only the evaluator post-purge fulfilments', () => {
    const { answers, evaluation } = canonicalViewOf(
      characterisationCorpus.find(({ name }) => name === 'gate-flipped').answers
    )

    expect(evaluation.fulfilments).not.toHaveProperty(
      purposeInInternalMarket.id
    )
    expect(evaluation.fulfilments).not.toHaveProperty(earTag.id)
    expect(answers).not.toHaveProperty('purposeInInternalMarket')
    expect(answers.commodityLines[0]).not.toHaveProperty('animalIdentifiers')
  })
})
