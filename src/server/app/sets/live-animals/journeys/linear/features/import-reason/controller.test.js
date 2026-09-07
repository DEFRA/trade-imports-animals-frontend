import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../flow/dispatch.js'
import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  postHandlerOf
} from '../../../../../../engine/test-support.js'
import { dispatchPages } from '../index.js'

import * as importReason from './controller.js'
import { copy } from './copy/copy.en.js'

const post = postHandlerOf(importReason)
const get = importReason.routes.find((route) => route.method === 'GET').handler

const EXIT_DATE_TEXT = '20/12/2026'
const EXIT_DATE_PARTS = { day: '20', month: '12', year: '2026' }

const configure = () => {
  configureRecords(recordsStub)
  configureSession(sessionStub)
  buildDispatch(dispatchPages)
}

describe('POST import-reason — invalid payload', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

  it('Should answer 400 and re-render an out-of-list reason, committing nothing', async () => {
    const result = await driveHandler(post, {
      payload: { reasonForImport: 'not-a-real-reason' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.reasonForImport).toBeDefined()
    expect(result.after).toEqual(result.before)
  })

  it('Should answer 400 for a reason that names an Object.prototype member, committing nothing', async () => {
    const result = await driveHandler(post, {
      payload: { reasonForImport: 'constructor' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.reasonForImport).toBeDefined()
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse an unanswered purpose on the internal-market reveal, committing nothing', async () => {
    const result = await driveHandler(post, {
      payload: {
        reasonForImport: 'internalMarket',
        purposeInInternalMarket: ''
      }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.purposeInInternalMarket).toBe(
      copy.errors.purposeRequired
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse an out-of-list purpose on the internal-market reveal', async () => {
    const result = await driveHandler(post, {
      payload: {
        reasonForImport: 'internalMarket',
        purposeInInternalMarket: 'not-a-real-purpose'
      }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.purposeInInternalMarket).toBe(
      copy.errors.purposeRequired
    )
    expect(result.after).toEqual(result.before)
  })

  // The reason radio stays optional to proceed; only the questions a chosen
  // reason opens are enforced.
  it('Should still accept a submit that names no reason at all', async () => {
    const result = await driveHandler(post, {
      payload: { reasonForImport: '' }
    })
    expect(result.response.redirect).toBeDefined()
  })

  it('Should refuse the destination country the transit reveal asks for and keep the port the user did choose', async () => {
    const result = await driveHandler(post, {
      payload: {
        reasonForImport: 'transit',
        transitPortOfExit: 'GB DVR',
        transitDestinationCountry: ''
      }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.transitDestinationCountry).toBeDefined()
    expect(result.view.context.values.transitPortOfExit).toBe('GB DVR')
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse the destination country the transhipment reveal asks for', async () => {
    const result = await driveHandler(post, {
      payload: {
        reasonForImport: 'transhipmentOrOnwardTravel',
        transhipmentDestinationCountry: ''
      }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.transhipmentDestinationCountry).toBe(
      copy.errors.countryRequired
    )
    expect(result.view.context.errors.transitDestinationCountry).toBeUndefined()
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse an unreal exit date the temporary-admission reveal asks for', async () => {
    const result = await driveHandler(post, {
      payload: {
        reasonForImport: 'temporaryAdmissionHorses',
        temporaryAdmissionExitDate: '31/2/2026',
        temporaryAdmissionPortOfExit: 'GB DVR'
      }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.temporaryAdmissionExitDate).toBeDefined()
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse a half-typed exit date and offer the raw text back', async () => {
    const result = await driveHandler(post, {
      payload: {
        reasonForImport: 'temporaryAdmissionHorses',
        temporaryAdmissionExitDate: '27/',
        temporaryAdmissionPortOfExit: 'GB DVR'
      }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.temporaryAdmissionExitDate).toBeDefined()
    expect(result.view.context.exitDateField.value).toBe('27/')
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse an unanswered port of exit on the transit reveal', async () => {
    const result = await driveHandler(post, {
      payload: {
        reasonForImport: 'transit',
        transitPortOfExit: '',
        transitDestinationCountry: 'IE'
      }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.transitPortOfExit).toBe(
      copy.errors.portRequired
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse an unanswered port of exit on the temporary-admission reveal', async () => {
    const result = await driveHandler(post, {
      payload: {
        reasonForImport: 'temporaryAdmissionHorses',
        temporaryAdmissionExitDate: EXIT_DATE_TEXT,
        temporaryAdmissionPortOfExit: ''
      }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.temporaryAdmissionPortOfExit).toBe(
      copy.errors.portRequired
    )
    expect(result.after).toEqual(result.before)
  })
})

describe('POST import-reason — the reveal the reason opens', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

  it('Should commit the transit reveal as the two answers behind its fields', async () => {
    const result = await driveHandler(post, {
      payload: {
        reasonForImport: 'transit',
        transitPortOfExit: 'GB DVR',
        transitDestinationCountry: 'IE'
      }
    })
    expect(result.after.portOfExit).toBe('GB DVR')
    expect(result.after.destinationCountry).toBe('IE')
  })

  it('Should drop the answers of the reason the user moved away from', async () => {
    const flipped = await driveHandler(post, {
      seed: {
        reasonForImport: 'transit',
        portOfExit: 'GB DVR',
        destinationCountry: 'IE'
      },
      payload: {
        reasonForImport: 'internalMarket',
        purposeInInternalMarket: 'breeding'
      }
    })
    expect(flipped.after.purposeInInternalMarket).toBe('breeding')
    expect(flipped.after.portOfExit).toBeUndefined()
    expect(flipped.after.destinationCountry).toBeUndefined()
  })

  it('Should commit the temporary-admission reveal as the two answers behind its fields', async () => {
    const result = await driveHandler(post, {
      payload: {
        reasonForImport: 'temporaryAdmissionHorses',
        temporaryAdmissionExitDate: EXIT_DATE_TEXT,
        temporaryAdmissionPortOfExit: 'GB DVR'
      }
    })
    expect(result.after.exitDate).toEqual(EXIT_DATE_PARTS)
    expect(result.after.portOfExit).toBe('GB DVR')
  })

  it('Should ignore a field belonging to a reason the user did not choose', async () => {
    const result = await driveHandler(post, {
      payload: {
        reasonForImport: 'transhipmentOrOnwardTravel',
        transhipmentDestinationCountry: 'FR',
        transitDestinationCountry: 'IE',
        transitPortOfExit: 'GB DVR'
      }
    })
    expect(result.response.redirect).toBeDefined()
    expect(result.after.destinationCountry).toBe('FR')
    expect(result.after.portOfExit).toBeUndefined()
  })
})

describe('GET import-reason — the reveals prefill from the one answer behind them', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

  it('Should offer a stored port of exit to both reveals that ask for it', async () => {
    const result = await driveHandler(get, {
      seed: { reasonForImport: 'transit', portOfExit: 'GB DVR' }
    })
    expect(result.view.context.values.transitPortOfExit).toBe('GB DVR')
    expect(result.view.context.values.temporaryAdmissionPortOfExit).toBe(
      'GB DVR'
    )
  })

  it('Should offer a stored exit date back to the temporary-admission reveal', async () => {
    const result = await driveHandler(get, {
      seed: {
        reasonForImport: 'temporaryAdmissionHorses',
        exitDate: EXIT_DATE_PARTS
      }
    })
    expect(result.view.context.exitDateField.value).toBe(EXIT_DATE_TEXT)
  })

  it('Should offer a stored destination country to both reveals that ask for it', async () => {
    const result = await driveHandler(get, {
      seed: {
        reasonForImport: 'transhipmentOrOnwardTravel',
        destinationCountry: 'IE'
      }
    })
    expect(result.view.context.values.transhipmentDestinationCountry).toBe('IE')
    expect(result.view.context.values.transitDestinationCountry).toBe('IE')
  })
})
