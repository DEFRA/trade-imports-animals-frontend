import { SET_ID } from '../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../flow/dispatch.js'
import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  journeyRequest,
  postHandlerOf,
  stubH
} from '../../../../../../engine/test-support.js'
import { dispatchPages } from '../index.js'
import { hubPath, pagePath } from '../../../../../../shared/paths.js'
import {
  BOS_TAURUS_ROW,
  FELIS_CATUS_ROW
} from '../commodities/search/test-support.js'
import * as cphNumber from '../cph-number/controller.js'

import * as addresses from './controller.js'
import { copy } from './copy/copy.en.js'
import { PARTIES } from './parties.js'

const getAddresses = addresses.routes.find(
  (route) => route.method === 'GET'
).handler
const postAddresses = addresses.routes.find(
  (route) => route.method === 'POST'
).handler
const postCphNumber = postHandlerOf(cphNumber)

const CPH_LINE = BOS_TAURUS_ROW
const CPH_EXEMPT_LINE = FELIS_CATUS_ROW

const rowsFor = async (seed, query = {}) =>
  driveHandler(getAddresses, { seed, query })
const CONSIGNOR_TITLE = 'Consignor or exporter'
const CONSIGNOR_SELECT_SLUG = 'consignors/select'
const ASTRA_NAME = 'Astra Rosales'
const CYA_SLUG = 'notification-view'

const rowTitled = (rows, title) =>
  rows.find((row) => row.key.html.includes(title))

const cphRowOf = (rows) => rowTitled(rows, copy.hub.cph.title)

beforeAll(() => {
  configureRecords(SET_ID, recordsStub)
  configureSession(SET_ID, sessionStub)
  buildDispatch(SET_ID, dispatchPages)
})
beforeEach(() => store.clear())

describe('GET addresses — conditional CPH hub row', () => {
  it('Should not render a CPH row when every commodity line is CPH-exempt', async () => {
    const result = await rowsFor({
      commodityLines: [CPH_EXEMPT_LINE]
    })
    const { rows } = result.view.context
    expect(rows).toHaveLength(5)
    expect(cphRowOf(rows)).toBeUndefined()
  })

  it('Should render an empty-state CPH row with an Add link into cph-number when a commodity line is not CPH-exempt', async () => {
    const result = await rowsFor({
      commodityLines: [CPH_LINE]
    })
    const { rows } = result.view.context
    const cphRow = cphRowOf(rows)
    expect(rows).toHaveLength(6)
    expect(cphRow.value.text).toBe('Not added yet')
    expect(cphRow.actions.items[0]).toMatchObject({
      href: pagePath(result.journeyId, 'cph-number?return=addresses'),
      text: 'Add'
    })
  })

  it('Should render the CPH value the CPH page saves, without slashes, with a Change link when answered', async () => {
    const saved = await driveHandler(postCphNumber, {
      seed: { commodityLines: [CPH_LINE] },
      payload: { cphCounty: '12', cphParish: '345', cphHolding: '6789' }
    })
    const result = await rowsFor(saved.after)
    const { rows } = result.view.context
    const cphRow = cphRowOf(rows)
    expect(cphRow.value.text).toBe('123456789')
    expect(cphRow.actions.items[0].text).toBe('Change')
  })
})

describe('GET addresses — copied party hub rows', () => {
  it('Should render the name held on the copy, offering both Change and Edit details', async () => {
    const result = await rowsFor({
      consignor: { name: ASTRA_NAME, address: { countryCode: 'CH' } }
    })
    const row = rowTitled(result.view.context.rows, CONSIGNOR_TITLE)

    expect(row.value.text).toBe(ASTRA_NAME)
    expect(row.actions.items).toEqual([
      {
        href: pagePath(result.journeyId, CONSIGNOR_SELECT_SLUG),
        text: 'Change',
        visuallyHiddenText: CONSIGNOR_TITLE.toLowerCase()
      },
      {
        href: `${pagePath(result.journeyId, 'consignors/edit')}?return=addresses`,
        text: 'Edit details',
        visuallyHiddenText: CONSIGNOR_TITLE.toLowerCase()
      }
    ])
  })

  it('Should carry the change context into the Edit details link', async () => {
    const result = await rowsFor(
      { consignor: { name: ASTRA_NAME } },
      { change: '1' }
    )
    const row = rowTitled(result.view.context.rows, CONSIGNOR_TITLE)

    expect(row.actions.items[1].href).toBe(
      `${pagePath(result.journeyId, 'consignors/edit')}?return=addresses&change=1`
    )
  })

  it('Should offer only Add for a role never answered', async () => {
    const result = await rowsFor({})
    const row = rowTitled(result.view.context.rows, CONSIGNOR_TITLE)

    expect(row.value.text).toBe('Not added yet')
    expect(row.actions.items).toEqual([
      expect.objectContaining({
        href: pagePath(result.journeyId, CONSIGNOR_SELECT_SLUG),
        text: 'Add'
      })
    ])
  })

  it('Should name a row from the copy, not from the address book entry at the same address', async () => {
    const renamedByTrader = 'Renamed By Trader'
    const result = await rowsFor({
      placeOfOrigin: {
        name: renamedByTrader,
        address: { addressLine1: '1 Farm Lane', countryCode: 'IE' }
      }
    })
    const row = rowTitled(result.view.context.rows, 'Place of origin')

    expect(row.value.text).toBe(renamedByTrader)
  })
})

describe('GET addresses — frozen parties on submitted notification', () => {
  it('Should render the name held on the copy once submitted', async () => {
    const frozenName = 'Frozen At Submit'
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, {
      placeOfOrigin: {
        name: frozenName,
        address: { addressLine1: '1 Lane', countryCode: 'GB' }
      }
    })
    await store.submit(journey.journeyId)

    const h = stubH()
    await getAddresses(journeyRequest(journey.journeyId), h)
    const row = rowTitled(h.captured.view.context.rows, 'Place of origin')

    expect(row.value.text).toBe(frozenName)
  })
})

describe('GET addresses — change context', () => {
  it('Should carry change context into every party link', async () => {
    const result = await rowsFor({}, { change: '1' })
    const { rows } = result.view.context

    for (const party of PARTIES) {
      expect(rowTitled(rows, party.title).actions.items[0].href).toBe(
        `${pagePath(result.journeyId, party.slug)}?change=1`
      )
    }
  })

  it('Should leave the CPH link alone, its slug already carrying a query string', async () => {
    const result = await rowsFor(
      { commodityLines: [CPH_LINE] },
      { change: '1' }
    )

    expect(cphRowOf(result.view.context.rows).actions.items[0].href).toBe(
      pagePath(result.journeyId, 'cph-number?return=addresses')
    )
  })

  it('Should render plain links when not changing', async () => {
    const result = await rowsFor({})
    const row = rowTitled(result.view.context.rows, CONSIGNOR_TITLE)

    expect(row.actions.items[0].href).toBe(
      pagePath(result.journeyId, CONSIGNOR_SELECT_SLUG)
    )
  })

  it('Should point Back at check your answers under change context', async () => {
    const result = await rowsFor({}, { change: '1' })

    expect(result.view.context.backLink).toBe(
      pagePath(result.journeyId, CYA_SLUG)
    )
  })

  it('Should point Back at the task list, never the review, while amending', async () => {
    const { journeyId, view } = await driveHandler(getAddresses, {
      query: { change: '1' },
      amend: true
    })

    expect(view.context.backLink).toBe(hubPath(journeyId))
  })

  it('Should point Back at the task list when not changing', async () => {
    const result = await rowsFor({})

    expect(result.view.context.backLink).toBe(hubPath(result.journeyId))
  })
})

describe('POST addresses — change context', () => {
  it('Should exit to check your answers when continuing under change context', async () => {
    const result = await driveHandler(postAddresses, { query: { change: '1' } })

    expect(result.response.redirect).toBe(pagePath(result.journeyId, CYA_SLUG))
  })

  it('Should follow the ordinary flow when continuing without change context', async () => {
    const result = await driveHandler(postAddresses, {})

    expect(result.response.redirect).toBe(hubPath(result.journeyId))
  })
})
