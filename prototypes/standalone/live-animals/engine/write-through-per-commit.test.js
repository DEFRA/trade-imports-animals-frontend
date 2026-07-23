import { beforeEach, describe, expect, it } from 'vitest'
import { commit } from './index.js'
import { records, configureRecords } from './persistence/records.js'
import { configureSession } from './persistence/session.js'
import { records as recordsStub } from '../services/persistence/records/stub.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from './read.js'
import { stubH, journeyRequest } from './test-support.js'
import {
  countryOfOrigin,
  internalReferenceNumber
} from '../model/obligations/obligations.js'

let journeyId
const buildRequest = () => journeyRequest(journeyId)

describe('#commit', () => {
  beforeEach(async () => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    await records.clear()
    configureReadyForCheckYourAnswers(() => false)
    journeyId = (await records.create()).journeyId
  })

  it('Should persist to the records port on the first commit, before any submit', async () => {
    await commit(buildRequest(), stubH(), { countryOfOrigin: 'FR' })
    expect((await records.load({ journeyId })).fulfilment).toEqual({
      [countryOfOrigin.id]: 'FR'
    })
  })

  it('Should overwrite the durable record on a second commit', async () => {
    await commit(buildRequest(), stubH(), { countryOfOrigin: 'FR' })
    await commit(buildRequest(), stubH(), {
      internalReferenceNumber: 'Imports456GB'
    })
    expect((await records.load({ journeyId })).fulfilment).toEqual({
      [countryOfOrigin.id]: 'FR',
      [internalReferenceNumber.id]: 'Imports456GB'
    })
  })
})
