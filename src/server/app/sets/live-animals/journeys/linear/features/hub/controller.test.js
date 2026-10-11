import { SET_ID } from '../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../flow/dispatch.js'
import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import { driveHandler } from '../../../../../../engine/test-support.js'
import { addUtcDays } from '../../../../../../lib/validate/index.js'
import { dispatchPages } from '../index.js'
import {
  arrivalWindow,
  DAYS_BEFORE
} from '../transport/port-of-entry/arrival-window.js'
import { routes } from './controller.js'
import { copy } from './copy/copy.en.js'

const getHandler = routes.find((route) => route.method === 'GET').handler

const ARRIVAL_DETAILS_TITLE = copy.rows.arrivalDetails.title
const COMPLETE = copy.statuses.complete
const TO_DO = copy.statuses.toDo

const rowsOf = (groups) => groups.flatMap((group) => group.items)
const rowByTitle = (groups, title) =>
  rowsOf(groups).find((item) => item.title.text === title)

const dateParts = (date) => ({
  day: String(date.getUTCDate()),
  month: String(date.getUTCMonth() + 1),
  year: String(date.getUTCFullYear())
})
const { min: EARLIEST_ALLOWED } = arrivalWindow()
const TODAY = dateParts(addUtcDays(EARLIEST_ALLOWED, DAYS_BEFORE))
const SEVEN_DAYS_AGO = dateParts(EARLIEST_ALLOWED)
const EIGHT_DAYS_AGO = dateParts(addUtcDays(EARLIEST_ALLOWED, -1))

// `GB ZZZ` is absent from the captured ports fixture (see
// port-of-entry.controller.test.js), so it doubles here as a stale stored
// port code. These answers are the Complete baseline: every field is present
// and passes its page rules, so each test changes one answer to break it.
const STALE_PORT = 'GB ZZZ'
const KNOWN_PORT = 'GB ABD'
const arrivalDetailsAnswers = {
  portOfEntry: KNOWN_PORT,
  arrivalDateAtPort: TODAY,
  meansOfTransport: 'ROAD_VEHICLE',
  transportIdentification: 'FR-892-LK',
  transportDocumentReference: 'CMR-2026-884721'
}

describe('#handler — stored-answer validity demotes the hub tag', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should read To do for a row whose stored answer no longer passes its own page rules, even though every field is present', async () => {
    const result = await driveHandler(getHandler, {
      seed: { ...arrivalDetailsAnswers, portOfEntry: STALE_PORT }
    })
    const row = rowByTitle(result.view.context.groups, ARRIVAL_DETAILS_TITLE)

    expect(row.status.tag.text).toBe(TO_DO)
  })

  it('Should read Complete for the same row once its stored port is one the reader still offers', async () => {
    const result = await driveHandler(getHandler, {
      seed: arrivalDetailsAnswers
    })
    const row = rowByTitle(result.view.context.groups, ARRIVAL_DETAILS_TITLE)

    expect(row.status.tag.text).toBe(COMPLETE)
  })
})

describe('#handler — a saved arrival date measured from today', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should read To do for Arrival details once its saved arrival date is more than 7 days in the past', async () => {
    const result = await driveHandler(getHandler, {
      seed: { ...arrivalDetailsAnswers, arrivalDateAtPort: EIGHT_DAYS_AGO }
    })
    const row = rowByTitle(result.view.context.groups, ARRIVAL_DETAILS_TITLE)

    expect(row.status.tag.text).toBe(TO_DO)
  })

  it('Should read Complete for Arrival details while its saved arrival date is exactly 7 days in the past', async () => {
    const result = await driveHandler(getHandler, {
      seed: { ...arrivalDetailsAnswers, arrivalDateAtPort: SEVEN_DAYS_AGO }
    })
    const row = rowByTitle(result.view.context.groups, ARRIVAL_DETAILS_TITLE)

    expect(row.status.tag.text).toBe(COMPLETE)
  })
})
