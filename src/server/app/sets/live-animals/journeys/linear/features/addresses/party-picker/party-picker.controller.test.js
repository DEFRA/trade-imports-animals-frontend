import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import { driveHandler } from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import * as addressBook from '../../../../../../../services/address-book/index.js'

import * as partyPicker from './party-picker.controller.js'
import { PARTIES } from '../parties.js'

const CONSIGNOR_SELECT_SLUG = 'consignors/select'
const NORDVIK_ID = 'nordvik-seafood'
const ALPINE_DAIRY_ID = 'alpine-dairy'
const DANISH_MEAT_ID = 'danish-meat-export-aps'
const SELECT_A_CONSIGNOR_ERROR = 'Select a consignor from the list'

const handlerFor = (method, slug) =>
  partyPicker.routes.find(
    (route) => route.method === method && route.path.endsWith(slug)
  ).handler

const getConsignor = handlerFor('GET', CONSIGNOR_SELECT_SLUG)
const postConsignor = handlerFor('POST', CONSIGNOR_SELECT_SLUG)

const pickerFrom = (result) => result.view.context.picker
const idsOf = (picker) => picker.rows.map((row) => row.id)

const configure = () => {
  configureRecords(recordsStub)
  configureSession(sessionStub)
  buildDispatch(dispatchPages)
}

describe('GET /consignors/select', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

  it('Should render the first page of the book with a radio per row and pagination over the rest', async () => {
    const picker = pickerFrom(await driveHandler(getConsignor))

    expect(picker.page).toBe(1)
    expect(picker.resultsCaption).toBe('Showing 5 of 13 addresses')
    expect(idsOf(picker)).toEqual([
      'astra-rosales',
      'tech-imports-ltd',
      'origin-farm',
      'british-livestock-ltd',
      'import-co-uk'
    ])
    expect(picker.rows[0]).toMatchObject({
      name: 'Astra Rosales',
      country: 'Switzerland',
      checked: false
    })
    expect(picker.pagination.items.at(-1).number).toBe(3)
    expect(picker.pagination.previous).toBeUndefined()
    expect(picker.selected).toBeUndefined()
  })

  it('Should expand each row into the whole record for the View details disclosure', async () => {
    const picker = pickerFrom(await driveHandler(getConsignor))
    const row = picker.rows[3]

    expect(row.addressText).toBe('10 Market Street, Leeds, LS1 6HB')
    expect(row.detailLines).toEqual([
      'British Livestock Ltd',
      '10 Market Street',
      'Leeds',
      'LS1 6HB',
      'United Kingdom',
      '01632 960000',
      'british-livestock-ltd@example.com'
    ])
  })

  it('Should render a later page, carrying the search and the selection into every pagination link', async () => {
    const result = await driveHandler(getConsignor, {
      query: { page: '2', selected: DANISH_MEAT_ID }
    })
    const picker = pickerFrom(result)

    expect(picker.page).toBe(2)
    expect(idsOf(picker)).toContain(NORDVIK_ID)
    expect(picker.selected.name).toBe('Danish Meat Export ApS')
    expect(picker.pagination.next.href).toBe(
      `${pagePath(result.journeyId, CONSIGNOR_SELECT_SLUG)}?page=3&selected=${DANISH_MEAT_ID}`
    )
    expect(picker.pagination.items[0].href).toBe(
      `${pagePath(result.journeyId, CONSIGNOR_SELECT_SLUG)}?page=1&selected=${DANISH_MEAT_ID}`
    )
  })

  it('Should filter the book down to the search matches and drop the pagination when one page holds them', async () => {
    const picker = pickerFrom(
      await driveHandler(getConsignor, { query: { q: 'denmark' } })
    )

    expect(picker.resultsCaption).toBe('Showing 2 of 2 addresses')
    expect(idsOf(picker)).toEqual([DANISH_MEAT_ID, 'jutland-swine-aps'])
    expect(picker.pagination).toBeNull()
  })

  it('Should pre-check the row the committed reference points at', async () => {
    const picker = pickerFrom(
      await driveHandler(getConsignor, {
        seed: { consignor: { addressId: ALPINE_DAIRY_ID } },
        query: { page: '3' }
      })
    )

    const row = picker.rows.find((each) => each.id === ALPINE_DAIRY_ID)
    expect(picker.selected.id).toBe(ALPINE_DAIRY_ID)
    expect(row.checked).toBe(true)
  })

  it('Should treat a soft-deleted selected reference as no selection', async () => {
    const originalMode = process.env.LIVE_ANIMALS_MODE
    process.env.LIVE_ANIMALS_MODE = 'real'
    const deletedId = 'deleted-consignor'
    vi.spyOn(addressBook, 'search').mockResolvedValue({
      results: [],
      total: 0,
      page: 1,
      totalPages: 1,
      pageSize: 5
    })
    vi.spyOn(addressBook, 'party').mockResolvedValue({
      id: deletedId,
      name: 'Gone Trader',
      deleted: true,
      address: { addressLine1: '1 Nowhere' }
    })

    try {
      // Drive via ?selected= so render()'s chosenPartyFor path is exercised
      // (a committed deleted ref is already cleared in state.get).
      const picker = pickerFrom(
        await driveHandler(getConsignor, {
          query: { selected: deletedId }
        })
      )

      expect(picker.selected).toBeUndefined()
      expect(picker.rows.every((row) => row.checked === false)).toBe(true)
    } finally {
      vi.restoreAllMocks()
      if (originalMode === undefined) {
        delete process.env.LIVE_ANIMALS_MODE
      } else {
        process.env.LIVE_ANIMALS_MODE = originalMode
      }
    }
  })
})

describe('POST /consignors/select', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

  it('Should re-render the matches from page one on a search, saving nothing', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'search', q: 'Copenhagen', page: '3' }
    })
    const picker = pickerFrom(result)

    expect(result.response.statusCode).toBe(200)
    expect(picker.page).toBe(1)
    expect(idsOf(picker)).toEqual([DANISH_MEAT_ID])
    expect(result.after.consignor).toBeUndefined()
  })

  it('Should carry a row ticked before the search across the round trip, still selected but off the results', async () => {
    const picker = pickerFrom(
      await driveHandler(postConsignor, {
        payload: { action: 'search', q: 'denmark', party: NORDVIK_ID }
      })
    )

    expect(picker.selected.id).toBe(NORDVIK_ID)
    expect(idsOf(picker)).not.toContain(NORDVIK_ID)
    expect(picker.rows.every((row) => row.checked === false)).toBe(true)
  })

  it('Should reference the row ticked on a later page and return to the addresses hub', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', page: '2', party: ALPINE_DAIRY_ID }
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, 'addresses')
    })
    expect(result.after.consignor).toEqual({ addressId: ALPINE_DAIRY_ID })
  })

  it('Should store the id and nothing else — no copy of the address travels with it', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', party: ALPINE_DAIRY_ID }
    })

    expect(Object.keys(result.after.consignor)).toEqual(['addressId'])
    expect(result.after.consignor.name).toBeUndefined()
    expect(result.after.consignor.address).toBeUndefined()
  })

  it('Should save the selection made on an earlier page when the page on screen has no row ticked', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', page: '3', selected: NORDVIK_ID }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.consignor).toEqual({ addressId: NORDVIK_ID })
  })

  it('Should let a row ticked on the page on screen beat the selection carried from an earlier one', async () => {
    const result = await driveHandler(postConsignor, {
      payload: {
        action: 'save',
        page: '2',
        selected: NORDVIK_ID,
        party: ALPINE_DAIRY_ID
      }
    })

    expect(result.after.consignor).toEqual({ addressId: ALPINE_DAIRY_ID })
  })

  it('Should reject a save with nothing selected, anchoring the error on the first row', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', page: '2' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.picker.error).toBe(SELECT_A_CONSIGNOR_ERROR)
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: SELECT_A_CONSIGNOR_ERROR, href: '#party' }
    ])
    expect(result.view.context.picker.page).toBe(2)
    expect(result.after.consignor).toBeUndefined()
  })

  it('Should anchor the error on the search box when the search matched nothing to select', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', q: 'no such trader' }
    })

    expect(result.view.context.errorSummary.errorList[0].href).toBe('#q')
    expect(result.view.context.picker.rows).toEqual([])
  })

  it('Should refuse an id that is not in the organisation book', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', party: 'not-in-this-book' }
    })

    expect(result.view.context.picker.error).toBe(SELECT_A_CONSIGNOR_ERROR)
    expect(result.after.consignor).toBeUndefined()
  })

  it('Should refuse a soft-deleted address id on save', async () => {
    const originalMode = process.env.LIVE_ANIMALS_MODE
    process.env.LIVE_ANIMALS_MODE = 'real'
    const deletedId = 'deleted-consignor'
    vi.spyOn(addressBook, 'search').mockResolvedValue({
      results: [],
      total: 0,
      page: 1,
      totalPages: 1,
      pageSize: 5
    })
    vi.spyOn(addressBook, 'party').mockResolvedValue({
      id: deletedId,
      name: 'Gone Trader',
      deleted: true,
      address: { addressLine1: '1 Nowhere' }
    })

    try {
      const result = await driveHandler(postConsignor, {
        payload: { action: 'save', party: deletedId }
      })

      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.picker.error).toBe(SELECT_A_CONSIGNOR_ERROR)
      expect(result.after.consignor).toBeUndefined()
    } finally {
      vi.restoreAllMocks()
      if (originalMode === undefined) {
        delete process.env.LIVE_ANIMALS_MODE
      } else {
        process.env.LIVE_ANIMALS_MODE = originalMode
      }
    }
  })
})

describe('The five spokes share the one picker', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

  it('Should serve every party from the one untyped book, committing to its own obligation', async () => {
    for (const party of PARTIES) {
      store.clear()
      const result = await driveHandler(handlerFor('POST', party.slug), {
        payload: { action: 'save', party: DANISH_MEAT_ID }
      })

      // A referenced party commits the id alone; an inline one also keeps
      // the details, because the notification holds a copy rather than tracking
      // later edits. Both carry the id — the picker needs it to pre-tick a row.
      expect(result.after[party.id]).toEqual(
        party.inline
          ? {
              addressId: DANISH_MEAT_ID,
              name: expect.any(String),
              address: expect.any(Object)
            }
          : { addressId: DANISH_MEAT_ID }
      )
      expect(result.response).toEqual({
        redirect: pagePath(result.journeyId, 'addresses')
      })
    }
  })

  it('Should offer the same records whichever spoke is being filled (D3)', async () => {
    const seen = []
    for (const party of PARTIES) {
      const result = await driveHandler(handlerFor('GET', party.slug))
      seen.push(idsOf(result.view.context.picker))
    }

    for (const ids of seen) {
      expect(ids).toEqual(seen[0])
    }
  })

  it('Should title each spoke and link its Add a new address button back to itself', async () => {
    for (const party of PARTIES) {
      const result = await driveHandler(handlerFor('GET', party.slug))

      expect(result.view.context.heading).toBe(party.title)
      expect(result.view.context.picker.createAddressHref).toBe(
        pagePath(result.journeyId, `addresses/create?for=${party.id}`)
      )
    }
  })
})
