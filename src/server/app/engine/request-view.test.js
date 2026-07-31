import { describe, expect, test } from 'vitest'
import { assembleFulfilments } from '../bridge/assemble-fulfilments.js'
import { projectAnswers } from '../bridge/fulfilments/index.js'
import { characterisationCorpus } from '../bridge/fixtures/characterisation-corpus.js'
import { obligationSet } from '../model/obligations/manifest.js'

const { earTag, purposeInInternalMarket } = obligationSet()
import {
  decodePersistedFulfilment,
  encodeEvaluatorFulfilments
} from '../services/persistence/records/fulfilment-codec/index.js'
import { assembleRequestView } from './request-view.js'

const canonicalViewOf = (answers) =>
  assembleRequestView(
    decodePersistedFulfilment(
      encodeEvaluatorFulfilments(assembleFulfilments(answers))
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
