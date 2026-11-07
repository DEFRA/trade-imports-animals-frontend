import { SET_ID } from '../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../flow/dispatch.js'
import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  completeNotification,
  driveHandler
} from '../../../../../../engine/test-support.js'
import { dispatchPages } from '../index.js'
import { routes } from './controller.js'
import { copy } from './copy/copy.en.js'

const getHandler = routes.find((route) => route.method === 'GET').handler

const ARRIVAL_DETAILS_TITLE = copy.rows.arrivalDetails.title
const COMPLETE = copy.statuses.complete
const TO_DO = copy.statuses.toDo

const rowsOf = (groups) => groups.flatMap((group) => group.items)
const rowByTitle = (groups, title) =>
  rowsOf(groups).find((item) => item.title.text === title)

// `GB ZZZ` is absent from the captured ports fixture (see
// port-of-entry.controller.test.js), so it doubles here as a stale stored
// port code — every other field on the row is answered, so the engine's own
// presence-based status reads this row FULFILLED regardless.
const STALE_PORT = 'GB ZZZ'
const KNOWN_PORT = 'GB ABD'
const arrivalDetailsAnswers = {
  portOfEntry: STALE_PORT,
  arrivalDateAtPort: { day: '12', month: '12', year: '2026' },
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
      seed: arrivalDetailsAnswers
    })
    const row = rowByTitle(result.view.context.groups, ARRIVAL_DETAILS_TITLE)

    expect(row.status.tag.text).toBe(TO_DO)
  })

  it('Should read Complete for the same row once its stored port is one the reader still offers', async () => {
    const result = await driveHandler(getHandler, {
      seed: { ...arrivalDetailsAnswers, portOfEntry: KNOWN_PORT }
    })
    const row = rowByTitle(result.view.context.groups, ARRIVAL_DETAILS_TITLE)

    expect(row.status.tag.text).toBe(COMPLETE)
  })
})

describe('#handler — Overview lists the journey in its page order', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should list the six group captions, and under them the task titles, in the order Save and continue visits them', async () => {
    const result = await driveHandler(getHandler, {
      seed: completeNotification()
    })

    expect(
      result.view.context.groups.map((group) => [
        group.caption,
        group.items.map((item) => item.title.text)
      ])
    ).toEqual([
      [
        copy.groups['about-the-consignment'],
        [
          copy.rows.origin.title,
          copy.rows.commodities.title,
          copy.rows.importReason.title
        ]
      ],
      [
        copy.groups['description-of-the-goods'],
        [
          copy.rows.consignmentDetails.title,
          copy.rows.animalIdentification.title,
          copy.rows.additionalDetails.title
        ]
      ],
      [
        copy.groups['transport-and-arrival'],
        [
          copy.rows.arrivalDetails.title,
          copy.rows.transitCountries.title,
          copy.rows.transporter.title
        ]
      ],
      [copy.groups.documents, [copy.rows.documents.title]],
      [copy.groups['consignment-parties'], [copy.rows.addresses.title]],
      [copy.groups['contact-address'], [copy.rows.contact.title]]
    ])
  })
})
