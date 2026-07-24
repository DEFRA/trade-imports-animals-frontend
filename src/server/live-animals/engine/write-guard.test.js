import { beforeEach, describe, expect, it } from 'vitest'
import { commit, appendEntryAt, submitJourney } from './write.js'
import {
  records,
  configureRecords,
  IN_PROGRESS
} from './persistence/records.js'
import { configureSession } from './persistence/session.js'
import { records as recordsStub } from '../services/persistence/records/stub.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from './read.js'
import { stubH, journeyRequest } from './test-support.js'

// Every key-introducing write asserts the whole resulting answers tree
// against the recognition surface (flow/obligation-source.js), and
// submitJourney asserts stored trees the write guards never saw — an
// unrecognised key is inert to the evaluator yet ships raw at finalise.

let journeyId
const buildRequest = () => journeyRequest(journeyId)

describe('#write.js — answer-key guard', () => {
  beforeEach(async () => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    configureReadyForCheckYourAnswers(() => true)
    await records.clear()
    journeyId = (await records.create()).journeyId
  })

  it('Should reject a commit whose patch carries a typo of an obligation name', async () => {
    await expect(
      commit(buildRequest(), stubH(), { animalIdentifierHorseName: 'Dobbin' })
    ).rejects.toThrow(/"animalIdentifierHorseName" at \(top level\).*commit/s)
  })

  it('Should reject an appended entry carrying an unrecognised key', async () => {
    await commit(buildRequest(), stubH(), {
      commodityLines: [
        { commoditySelection: 'Horse', numberOfAnimalsQuantity: '1' }
      ]
    })
    await expect(
      appendEntryAt(
        buildRequest(),
        stubH(),
        ['commodityLines', 0, 'animalIdentifiers'],
        { horsName: 'Dobbin' }
      )
    ).rejects.toThrow(
      /"horsName" at commodityLines\[0\]\.animalIdentifiers\[0\]/
    )
  })

  it('Should accept legitimate writes untouched', async () => {
    const { answers } = await commit(buildRequest(), stubH(), {
      countryOfOrigin: 'FR'
    })
    expect(answers.countryOfOrigin).toBe('FR')
  })

  it('Should not project an unknown historic UUID into page answers at submit', async () => {
    await records.replaceFulfilment(journeyId, {
      'historic-obligation-uuid': 'Dobbin'
    })

    const result = await submitJourney(buildRequest(), stubH())

    expect(result.ok).toBe(true)
    expect((await records.load({ journeyId })).status).not.toBe(IN_PROGRESS)
  })
})
