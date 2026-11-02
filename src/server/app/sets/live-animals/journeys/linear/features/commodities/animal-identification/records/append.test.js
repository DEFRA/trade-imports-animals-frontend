import { SET_ID } from '../../../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../../services/persistence/session/stub.js'
import {
  journeyRequest,
  stubH
} from '../../../../../../../../engine/test-support.js'
import { seedWithCommodityLineOfAnimals } from '../../../../../../test-support.js'
import { dispatchPages } from '../../../index.js'
import { copy } from '../../copy/copy.en.js'
import { appendLineRecords } from './append.js'

describe('#appendLineRecords', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should refuse a record for a line already holding its one animal and return the line index and cap on the card error', async () => {
    const [line] = seedWithCommodityLineOfAnimals(1).commodityLines
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, {
      commodityLines: [
        { ...line, animalIdentifiers: [{ animalIdentifierPassport: 'UK1' }] }
      ]
    })
    const request = journeyRequest(journey.journeyId)
    const formHoldingData = {
      holdsData: true,
      values: { animalIdentifierPassport: 'UK2' },
      showAddress: false,
      addressValues: {}
    }

    const cardErrors = await appendLineRecords(
      request,
      stubH(),
      new Map([[0, formHoldingData]])
    )

    expect(cardErrors).toEqual([
      { index: 0, cap: 1, text: copy.identification.errors.capReached(1) }
    ])
    expect(request.logger.entries).toEqual([])
  })
})
