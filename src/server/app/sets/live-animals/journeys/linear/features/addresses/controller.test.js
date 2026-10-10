import { SET_ID } from '../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildDispatch } from '../../../../../../flow/dispatch.js'
import { store } from '../../../../../../engine/store.js'
import {
  configureRecords,
  records
} from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  journeyRequest,
  stubH
} from '../../../../../../engine/test-support.js'
import { dispatchPages } from '../index.js'
import { hubPath, pagePath } from '../../../../../../shared/paths.js'
import * as addressBook from '../../../../../../services/address-book/index.js'

import * as addresses from './controller.js'
import { PARTIES } from './parties.js'

const getAddresses = addresses.routes.find(
  (route) => route.method === 'GET'
).handler
const postAddresses = addresses.routes.find(
  (route) => route.method === 'POST'
).handler

const rowsFor = async (seed, query = {}) =>
  driveHandler(getAddresses, { seed, query })
const cphRowOf = (rows) =>
  rows.find((row) =>
    row.key.html.includes('County parish holding (CPH) number')
  )
const CONSIGNOR_TITLE = 'Consignor or exporter'
const CONSIGNOR_SELECT_SLUG = 'consignors/select'
const ASTRA_NAME = 'Astra Rosales'
const CYA_SLUG = 'notification-view'

const rowTitled = (rows, title) =>
  rows.find((row) => row.key.html.includes(title))

describe('GET addresses — conditional CPH hub row', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should not render a CPH row when no CPH-triggering commodity line exists', async () => {
    const result = await rowsFor({
      commodityLines: [{ commoditySelection: 'Cat' }]
    })
    const { rows } = result.view.context
    expect(rows).toHaveLength(5)
    expect(cphRowOf(rows)).toBeUndefined()
  })

  it('Should render an empty-state CPH row with an Add link into cph-number when a CPH-triggering commodity line exists', async () => {
    const result = await rowsFor({
      commodityLines: [{ commoditySelection: 'Cow' }]
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

  it('Should render the stored (slash-stripped) CPH value with a Change link when answered', async () => {
    const result = await rowsFor({
      commodityLines: [{ commoditySelection: 'Cow' }],
      countyParishHoldingCph: '123456789'
    })
    const { rows } = result.view.context
    const cphRow = cphRowOf(rows)
    expect(cphRow.value.text).toBe('123456789')
    expect(cphRow.actions.items[0].text).toBe('Change')
  })
})

describe('GET addresses — copied party hub rows', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

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

  it('Should never consult the address book to name a row', async () => {
    const partySpy = vi.spyOn(addressBook, 'party')
    await rowsFor({
      placeOfOrigin: { name: 'Origin Copy', address: { countryCode: 'IE' } }
    })

    expect(partySpy).not.toHaveBeenCalled()
  })
})

describe('GET addresses — frozen parties on submitted notification', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

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

    try {
      const h = stubH()
      await getAddresses(journeyRequest(journey.journeyId), h)
      const row = rowTitled(h.captured.view.context.rows, 'Place of origin')

      expect(row.value.text).toBe(frozenName)
    } finally {
      /* no spy */
    }
  })
})

describe('GET addresses — change context', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

  // Check your answers sends a trader here to change an address. The context
  // has to survive the trip out to the picker and back, or
  // the save at the far end exits into the section flow instead of returning
  // them to the summary that sent them.
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
      { commodityLines: [{ commoditySelection: 'Cow' }] },
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
    const journey = await store.create()
    await store.submit(journey.journeyId)
    await records.amend(journey.journeyId)
    const h = stubH()

    await getAddresses(
      journeyRequest(journey.journeyId, { query: { change: '1' } }),
      h
    )

    expect(h.captured.view.context.backLink).toBe(hubPath(journey.journeyId))
  })

  it('Should point Back at the task list when not changing', async () => {
    const result = await rowsFor({})

    expect(result.view.context.backLink).toBe(hubPath(result.journeyId))
  })
})

describe('POST addresses — change context', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should exit to check your answers when continuing under change context', async () => {
    const result = await driveHandler(postAddresses, { query: { change: '1' } })

    expect(result.response.redirect).toBe(pagePath(result.journeyId, CYA_SLUG))
  })

  it('Should follow the ordinary flow when continuing without change context', async () => {
    const result = await driveHandler(postAddresses, {})

    expect(result.response.redirect).not.toBe(
      pagePath(result.journeyId, CYA_SLUG)
    )
    expect(result.response.redirect).toBe(hubPath(result.journeyId))
  })
})
