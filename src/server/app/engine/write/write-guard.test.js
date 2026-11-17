import { SET_ID } from '../../../../../test/fixtures/index.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { commit, appendEntryAt, submitJourney } from './index.js'
import { records, configureRecords, SUBMITTED } from '../persistence/records.js'
import { configureSession } from '../persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers, get } from '../read.js'
import { stubH, journeyRequest } from '../test-support.js'

let journeyId
const buildRequest = () => journeyRequest(journeyId)

describe('engine write — answer-key guard', () => {
  beforeEach(async () => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    configureReadyForCheckYourAnswers(SET_ID, () => true)
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
      commodityLines: [{ commodityCode: '0101', numberOfAnimalsQuantity: '1' }]
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

  it('Should not project an unknown obligation id into page answers at submit', async () => {
    await records.replaceFulfilment(journeyId, {
      'unknown-obligation-uuid': 'Dobbin'
    })
    const { concurrencyToken } = await records.load({ journeyId })
    expect((await get(buildRequest(), stubH())).answers).toEqual({})

    const result = await submitJourney(buildRequest(), stubH(), {
      concurrencyToken
    })

    expect(result.ok).toBe(true)
    expect((await records.load({ journeyId })).status).toBe(SUBMITTED)
  })
})
