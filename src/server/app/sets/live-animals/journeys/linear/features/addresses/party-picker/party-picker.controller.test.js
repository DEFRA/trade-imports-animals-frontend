import { SET_ID } from '../../../../../set.js'
import { describe, expect, it, vi } from 'vitest'

import { config } from '../../../../../../../../../config/config.js'
import { store } from '../../../../../../../engine/store.js'
import {
  driveHandler,
  addressBookAnswering,
  expectOneLogged,
  expectOneRefusalLogged,
  expectOneSaveFallbackLogged,
  resetMocksAndConfigAfterTests,
  unavailableBackendError,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../../lib/http-status.js'

import * as partyPicker from './party-picker.controller.js'
import { PARTIES } from '../parties.js'
import { expectAddedAddressBannerShownOnce } from '../test-support.js'

const CONSIGNOR_SELECT_SLUG = 'consignors/select'
const NORDVIK_ID = 'nordvik-seafood'
const ALPINE_DAIRY_ID = 'alpine-dairy'
const ALPINE_DAIRY_NAME = 'Alpine Dairy GmbH'
const DANISH_MEAT_ID = 'danish-meat-export-aps'
const DANISH_MEAT_NAME = 'Danish Meat Export ApS'
const NOT_IN_THE_BOOK = 'not-in-this-book'
const SELECT_A_CONSIGNOR_ERROR = 'Select a consignor from the list'
const INS_FRONTEND_BASE_URL_KEY = 'tradeImportsInsFrontend.baseUrl'

const handlerFor = (method, slug) =>
  partyPicker.routes.find(
    (route) => route.method === method && route.path.endsWith(slug)
  ).handler

const getConsignor = handlerFor('GET', CONSIGNOR_SELECT_SLUG)
const postConsignor = handlerFor('POST', CONSIGNOR_SELECT_SLUG)

const DELETED_CONSIGNOR_ID = 'deleted-consignor'

const answerWithDeletedConsignor = () =>
  addressBookAnswering((request) =>
    request.url.includes(`/addresses/${DELETED_CONSIGNOR_ID}`)
      ? {
          body: JSON.stringify({
            id: DELETED_CONSIGNOR_ID,
            name: 'Gone Trader',
            deleted: true,
            addressLine1: '1 Nowhere'
          })
        }
      : {
          body: JSON.stringify({
            items: [],
            page: 1,
            pageSize: 25,
            totalItems: 0,
            totalPages: 1
          })
        }
  )

const pickerFrom = (result) => result.view.context.picker
const idsOf = (picker) => picker.rows.map((row) => row.id)

describe('GET /consignors/select', () => {
  resetMocksAndConfigAfterTests()
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should render the first page of the book with a radio per row and pagination over the rest', async () => {
    const picker = pickerFrom(await driveHandler(getConsignor))

    expect(picker.page).toBe(1)
    expect(picker.resultsCount).toBe('Showing 5 out of 13 results')
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
    expect(picker.selected.name).toBe(DANISH_MEAT_NAME)
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

    expect(picker.resultsCount).toBe('Showing 2 out of 2 results')
    expect(idsOf(picker)).toEqual([DANISH_MEAT_ID, 'jutland-swine-aps'])
    expect(picker.pagination).toBeNull()
  })

  it('Should open with the record the held copy was picked from selected, carried into pagination', async () => {
    const result = await driveHandler(getConsignor, {
      seed: {
        consignor: { pickedFromId: DANISH_MEAT_ID, name: 'Copied Name' }
      },
      query: { page: '2' }
    })
    const picker = pickerFrom(result)

    expect(picker.selected.name).toBe(DANISH_MEAT_NAME)
    expect(picker.pagination.next.href).toBe(
      `${pagePath(result.journeyId, CONSIGNOR_SELECT_SLUG)}?page=3&selected=${DANISH_MEAT_ID}`
    )
  })

  it('Should open with nothing selected when the held copy has no record it was picked from', async () => {
    const picker = pickerFrom(
      await driveHandler(getConsignor, {
        seed: { consignor: { name: ALPINE_DAIRY_NAME } },
        query: { page: '3' }
      })
    )

    expect(picker.selected).toBeUndefined()
    expect(picker.rows.some((row) => row.checked)).toBe(false)
  })

  it('Should treat a soft-deleted selected reference as no selection', async () => {
    answerWithDeletedConsignor()

    const picker = pickerFrom(
      await driveHandler(getConsignor, {
        query: { selected: DELETED_CONSIGNOR_ID }
      })
    )

    expect(picker.selected).toBeUndefined()
    expect(picker.rows.every((row) => row.checked === false)).toBe(true)
  })
})

describe('POST /consignors/select', () => {
  resetMocksAndConfigAfterTests()
  useStubbedJourney(SET_ID, dispatchPages)

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

  it('Should copy the row ticked on a later page and return to the addresses hub', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', page: '2', party: ALPINE_DAIRY_ID }
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, 'addresses')
    })
    expect(result.after.consignor).toMatchObject({ name: ALPINE_DAIRY_NAME })
  })

  it('Should store a copy of the record, noting which record it was picked from', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', party: ALPINE_DAIRY_ID }
    })

    expect(result.after.consignor).not.toHaveProperty('addressId')
    expect(result.after.consignor.pickedFromId).toBe(ALPINE_DAIRY_ID)
    expect(result.after.consignor.name).toBe(ALPINE_DAIRY_NAME)
    expect(result.after.consignor.address).toMatchObject({
      addressLine1: expect.any(String),
      countryCode: expect.any(String)
    })
  })

  it('Should save the selection made on an earlier page when the page on screen has no row ticked', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', page: '3', selected: NORDVIK_ID }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.consignor).toMatchObject({
      name: 'Nordvik Seafood AS'
    })
  })

  it('Should keep the copy already held when saved with nothing selected', async () => {
    const held = { name: 'Held Consignor', address: { countryCode: 'FR' } }
    const result = await driveHandler(postConsignor, {
      seed: { consignor: held },
      payload: { action: 'save' }
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, 'addresses')
    })
    expect(result.after.consignor).toEqual(held)
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

    expect(result.after.consignor).toMatchObject({ name: ALPINE_DAIRY_NAME })
  })

  it('Should return to the addresses page with the consignor still empty when saved with nothing selected', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', page: '2' }
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, 'addresses')
    })
    expect(result.after.consignor).toBeUndefined()
    expectOneLogged(result.logger, {
      level: 'info',
      fields: { journeyId: result.journeyId, role: 'consignor' },
      message: 'Address picker saved with no address chosen, nothing committed'
    })
  })

  it('Should return to the addresses page when saved with nothing selected after a search that matched nothing', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', q: 'no such trader' }
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, 'addresses')
    })
    expect(result.after.consignor).toBeUndefined()
  })

  it('Should refuse an id that is not in the organisation book, logging the refused id', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', party: NOT_IN_THE_BOOK }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.picker.error).toBe(SELECT_A_CONSIGNOR_ERROR)
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: SELECT_A_CONSIGNOR_ERROR, href: '#party' }
    ])
    expect(result.after.consignor).toBeUndefined()
    expectOneRefusalLogged(result.logger, {
      journeyId: result.journeyId,
      errorCodes: ['party'],
      role: 'consignor',
      addressId: NOT_IN_THE_BOOK
    })
  })

  it('Should anchor the refusal on the search box when the search matched nothing to select', async () => {
    const result = await driveHandler(postConsignor, {
      payload: {
        action: 'save',
        q: 'no such trader',
        party: NOT_IN_THE_BOOK
      }
    })

    expect(result.view.context.errorSummary.errorList[0].href).toBe('#q')
    expect(result.view.context.picker.rows).toEqual([])
  })

  it('Should refuse a soft-deleted address id on save', async () => {
    answerWithDeletedConsignor()

    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', party: DELETED_CONSIGNOR_ID }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.picker.error).toBe(SELECT_A_CONSIGNOR_ERROR)
    expect(result.after.consignor).toBeUndefined()
  })
})

describe('The five spokes share the one picker', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should serve every party from the one untyped book, committing to its own obligation', async () => {
    for (const party of PARTIES) {
      store.clear()
      const result = await driveHandler(handlerFor('POST', party.slug), {
        payload: { action: 'save', party: DANISH_MEAT_ID }
      })

      expect(result.after[party.id]).toMatchObject({
        name: DANISH_MEAT_NAME
      })
      expect(result.response).toEqual({
        redirect: pagePath(result.journeyId, 'addresses')
      })
    }
  })

  it('Should return every spoke to the addresses page, committing nothing, when saved with nothing selected', async () => {
    for (const party of PARTIES) {
      store.clear()
      const result = await driveHandler(handlerFor('POST', party.slug), {
        payload: { action: 'save' }
      })

      expect(result.after[party.id]).toBeUndefined()
      expect(result.response).toEqual({
        redirect: pagePath(result.journeyId, 'addresses')
      })
    }
  })

  it('Should offer the same records whichever spoke is being filled', async () => {
    const seen = []
    for (const party of PARTIES) {
      const result = await driveHandler(handlerFor('GET', party.slug))
      seen.push(idsOf(result.view.context.picker))
    }

    for (const ids of seen) {
      expect(ids).toEqual(seen[0])
    }
  })

  it('Should title each spoke and offer no INS add link in stub mode', async () => {
    for (const party of PARTIES) {
      const result = await driveHandler(handlerFor('GET', party.slug))

      expect(result.view.context.heading).toBe(party.title)
      expect(result.view.context.addAddressHref).toBeFalsy()
    }
  })
})

describe('GET /consignors/select — handshake return', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should surface a not-found handshake error', async () => {
    const result = await driveHandler(getConsignor, {
      query: { handshakeError: 'not-found' }
    })

    expect(result.view.context.picker.error).toContain('could not be found')
    expect(result.view.context.recoverableError).toBe(false)
  })

  it('Should surface an unavailable handshake error', async () => {
    const result = await driveHandler(getConsignor, {
      query: { handshakeError: 'unavailable' }
    })

    expect(result.view.context.picker.error).toContain('could not be reached')
    expect(result.view.context.recoverableError).toBe(true)
  })
})

describe('GET /consignors/select — added address banner', () => {
  useStubbedJourney(SET_ID, dispatchPages)
  resetMocksAndConfigAfterTests()

  it('Should show the added address banner once, then unstate it', async () => {
    await expectAddedAddressBannerShownOnce(getConsignor)
  })
})

describe('GET /consignors/select — list order', () => {
  useStubbedJourney(SET_ID, dispatchPages)
  resetMocksAndConfigAfterTests()

  it('Should list the addresses in the order the address book returns them', async () => {
    const listed = (id, name) => ({
      id,
      name,
      deleted: false,
      addressLine1: '1 Test Lane'
    })
    addressBookAnswering({
      body: JSON.stringify({
        items: [
          listed('zeta-newer', 'Zebra Farm'),
          listed('alpha-older', 'Aardvark Farm')
        ],
        page: 1,
        pageSize: 25,
        totalItems: 2,
        totalPages: 1
      })
    })

    const result = await driveHandler(getConsignor)

    expect(idsOf(pickerFrom(result))).toEqual(['zeta-newer', 'alpha-older'])
  })
})

describe('INS add-address link', () => {
  useStubbedJourney(SET_ID, dispatchPages)
  resetMocksAndConfigAfterTests(INS_FRONTEND_BASE_URL_KEY)

  it.each(PARTIES.map((party) => [party.title, party.slug]))(
    'Should offer an INS add-address link when not in stub mode (%s)',
    async (_title, slug) => {
      config.set('stubMode', false)
      config.set(INS_FRONTEND_BASE_URL_KEY, 'http://localhost:3002')
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({
          ok: true,
          json: async () => ({
            items: [],
            page: 1,
            pageSize: 25,
            totalItems: 0,
            totalPages: 1
          })
        }))
      )

      const result = await driveHandler(handlerFor('GET', slug))

      expect(result.view.context.addAddressHref).toContain(
        'http://localhost:3002/address-book/add'
      )
      expect(result.view.context.addAddressHref).toContain(
        'journey-type=gbn-ag'
      )
      expect(result.view.context.addAddressHref).toContain(
        `notification-id=${result.journeyId}`
      )
      expect(result.view.context.addAddressHref).toContain('fulfilment-id=')
    }
  )
})

describe('POST /consignors/select — recoverable save failure', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should re-render the picker when saving the selection fails', async () => {
    const failure = unavailableBackendError('save answers')
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', party: ALPINE_DAIRY_ID },
      saveFailure: failure
    })

    expect(result.response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after.consignor).toBeUndefined()
    expectOneSaveFallbackLogged(result.logger, {
      journeyId: result.journeyId,
      err: failure,
      role: 'consignor',
      addressId: ALPINE_DAIRY_ID
    })
  })
})

describe('/consignors/select — change context', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should hand the save back to the hub still changing', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', party: ALPINE_DAIRY_ID },
      query: { change: '1' }
    })

    expect(result.response).toEqual({
      redirect: `${pagePath(result.journeyId, 'addresses')}?change=1`
    })
    expect(result.after.consignor).toMatchObject({
      name: ALPINE_DAIRY_NAME
    })
  })

  it('Should point Back at the hub still changing', async () => {
    const result = await driveHandler(getConsignor, { query: { change: '1' } })

    expect(result.view.context.backLink).toBe(
      `${pagePath(result.journeyId, 'addresses')}?change=1`
    )
  })

  it('Should keep changing across a paged link, beside the search and the selection', async () => {
    const result = await driveHandler(getConsignor, {
      query: { page: '2', selected: DANISH_MEAT_ID, change: '1' }
    })

    expect(pickerFrom(result).pagination.next.href).toBe(
      `${pagePath(result.journeyId, CONSIGNOR_SELECT_SLUG)}?page=3&selected=${DANISH_MEAT_ID}&change=1`
    )
  })

  it('Should leave the hub link and the paged links plain when not changing', async () => {
    const result = await driveHandler(getConsignor, {
      query: { page: '2', selected: DANISH_MEAT_ID }
    })

    expect(result.view.context.backLink).toBe(
      pagePath(result.journeyId, 'addresses')
    )
    expect(pickerFrom(result).pagination.next.href).not.toContain('change')
  })
})

describe('/consignors/select — save and return while amending', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  const HELD_CONSIGNOR = {
    name: 'Held Consignor',
    address: { countryCode: 'FR' }
  }

  const postAmending = (payload, query) =>
    driveHandler(postConsignor, {
      seed: { consignor: HELD_CONSIGNOR },
      payload,
      query,
      amend: true
    })

  it('Should return a chosen party to the review from a Change link', async () => {
    const { journeyId, response } = await postAmending(
      { action: 'save', party: ALPINE_DAIRY_ID },
      { change: '1' }
    )

    expect(response).toEqual({
      redirect: pagePath(journeyId, 'notification-view')
    })
  })

  it('Should return to the review when saved with nothing chosen and an answer held', async () => {
    const { journeyId, response } = await postAmending(
      { action: 'save' },
      { change: '1' }
    )

    expect(response).toEqual({
      redirect: pagePath(journeyId, 'notification-view')
    })
  })

  it('Should go on to the addresses hub, plain, from Save and continue', async () => {
    const { journeyId, response } = await postAmending(
      { action: 'save', party: ALPINE_DAIRY_ID },
      {}
    )

    expect(response).toEqual({ redirect: pagePath(journeyId, 'addresses') })
  })

  it('Should keep a draft going back to the addresses hub still changing', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', party: ALPINE_DAIRY_ID },
      query: { change: '1' }
    })

    expect(result.response).toEqual({
      redirect: `${pagePath(result.journeyId, 'addresses')}?change=1`
    })
  })
})
