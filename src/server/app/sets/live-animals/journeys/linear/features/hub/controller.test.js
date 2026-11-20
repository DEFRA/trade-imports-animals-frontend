import { SET_ID } from '../../../../set.js'
import { describe, expect, it } from 'vitest'

import {
  completeNotification,
  driveHandler,
  useStubbedJourney
} from '../../../../../../engine/test-support.js'
import { dispatchPages } from '../index.js'
import {
  seedFromFranceWithOneEarTaggedCattle,
  withOriginSaved
} from '../../../../test-support.js'
import { BOS_TAURUS_ROW, lineOf } from '../commodities/search/test-support.js'
import { readDate } from '../../../../../../shared/kit.js'
import { formatDateText } from '../../../../../../lib/validate/calendar.js'
import { arrivalWindow } from '../transport/port-of-entry/arrival-window.js'
import { routes } from './controller.js'
import { copy } from './copy/copy.en.js'

const getHandler = routes.find((route) => route.method === 'GET').handler

const ARRIVAL_DETAILS_TITLE = copy.rows.arrivalDetails.title
const COMPLETE = copy.statuses.complete
const TO_DO = copy.statuses.toDo

const rowsOf = (groups) => groups.flatMap((group) => group.items)
const rowByTitle = (groups, title) =>
  rowsOf(groups).find((item) => item.title.text === title)

const STALE_PORT = 'GB ZZZ'
const KNOWN_PORT = 'GB ABD'
const latestArrivalDate = arrivalWindow().max
const arrivalDetailsAnswers = {
  portOfEntry: STALE_PORT,
  arrivalDateAtPort: readDate(
    { arrivalDateAtPort: formatDateText(latestArrivalDate) },
    'arrivalDateAtPort'
  ),
  meansOfTransport: 'ROAD_VEHICLE',
  transportIdentification: 'FR-892-LK',
  transportDocumentReference: 'CMR-2026-884721'
}

describe('#handler — stored-answer validity demotes the hub tag', () => {
  useStubbedJourney(SET_ID, dispatchPages)

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

  it('Should read Identification details To do for a stored animal record carrying no identifier, and Complete for one carrying an ear tag', async () => {
    const identificationStatusOf = async (seed) => {
      const result = await driveHandler(getHandler, { seed })
      return rowByTitle(
        result.view.context.groups,
        copy.rows.animalIdentification.title
      ).status.tag.text
    }

    expect(
      await identificationStatusOf(seedFromFranceWithOneEarTaggedCattle())
    ).toBe(COMPLETE)
    expect(
      await identificationStatusOf(
        withOriginSaved({
          commodityLines: [
            lineOf(BOS_TAURUS_ROW, {
              numberOfAnimalsQuantity: '1',
              animalIdentifiers: [{ animalIdentifierEarTag: '' }]
            })
          ]
        })
      )
    ).toBe(TO_DO)
  })
})

describe('#handler — every task link carries the mark that it was opened from Overview', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should link every task row to its page with exactly the Overview mark added', async () => {
    const result = await driveHandler(getHandler, {
      seed: completeNotification()
    })
    const items = rowsOf(result.view.context.groups)

    expect(items.length).toBeGreaterThan(0)
    for (const item of items) {
      const [pagePathOfRow] = item.href.split('?')
      expect(item.href).toBe(`${pagePathOfRow}?from=overview`)
    }
  })
})

describe('#handler — Overview lists the journey in its page order', () => {
  useStubbedJourney(SET_ID, dispatchPages)

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
