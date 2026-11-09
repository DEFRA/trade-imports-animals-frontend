import { SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'

import { store } from '../../../../../../../engine/store.js'
import {
  amendmentOpened,
  driveHandler,
  openedFromChangeLink,
  refusingSaves,
  addressBookAnswering,
  addressBookPage,
  expectOneLogged,
  expectOneRefusalLogged,
  expectOneSaveFallbackLogged,
  listedAddress,
  resetMocksAndConfigAfterTests,
  unavailableBackendError,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import { useInsFrontendBaseUrl } from '../../../../../../../../common/test-helpers/use-ins-frontend-base-url.js'
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
          body: JSON.stringify(
            listedAddress(DELETED_CONSIGNOR_ID, 'Gone Trader', {
              deleted: true
            })
          )
        }
      : addressBookPage()
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

  it('Should give each row its street lines and then its town and postcode on one line', async () => {
    const picker = pickerFrom(await driveHandler(getConsignor))

    expect(picker.rows.map((row) => row.addressLines)).toEqual([
      ['43 East Hague Extension', 'Bern, 30055'],
      ['18 Dockside Road', 'London, E14 9GE'],
      ['1 Farm Lane', 'Ennis, V95 X7P2'],
      ['10 Market Street', 'Leeds, LS1 6HB'],
      ['20 Trade Road', 'London, EC1A 1BB']
    ])
  })

  it('Should render the picker across the full width of the content column', async () => {
    const result = await driveHandler(getConsignor)

    expect(result.view.context.contentColumnClass).toBe(
      'govuk-grid-column-full'
    )
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

  it('Should show the added address banner with the address name, then clear its cookie so it shows only once', async () => {
    await expectAddedAddressBannerShownOnce(getConsignor)
  })
})

describe('GET /consignors/select — list order', () => {
  useStubbedJourney(SET_ID, dispatchPages)
  resetMocksAndConfigAfterTests()

  it('Should list the addresses in the order the address book returns them', async () => {
    addressBookAnswering(
      addressBookPage([
        listedAddress('zeta-newer', 'Zebra Farm'),
        listedAddress('alpha-older', 'Aardvark Farm')
      ])
    )

    const result = await driveHandler(getConsignor)

    expect(idsOf(pickerFrom(result))).toEqual(['zeta-newer', 'alpha-older'])
  })
})

describe('INS add-address link', () => {
  useStubbedJourney(SET_ID, dispatchPages)
  resetMocksAndConfigAfterTests()
  const setInsFrontendBaseUrl = useInsFrontendBaseUrl()

  it.each(PARTIES.map((party) => [party.title, party.slug]))(
    'Should offer an INS add-address link when not in stub mode (%s)',
    async (_title, slug) => {
      setInsFrontendBaseUrl('http://localhost:3002')
      addressBookAnswering(addressBookPage())

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

describe('View link to the INS address book', () => {
  useStubbedJourney(SET_ID, dispatchPages)
  resetMocksAndConfigAfterTests()
  const setInsFrontendBaseUrl = useInsFrontendBaseUrl()

  const insAddressHrefReturningTo = (addressId, returnPath) =>
    `http://ins.example/address-book/${addressId}?${new URLSearchParams({ return: returnPath })}`

  const firstViewHrefOf = (result) => pickerFrom(result).rows[0].viewHref

  it('Should link each row to its INS address page, returning to this picker with its search and selection', async () => {
    setInsFrontendBaseUrl('http://ins.example/')

    const result = await driveHandler(getConsignor, {
      query: { q: 'denmark', selected: ALPINE_DAIRY_ID }
    })

    const pickerReturn = `${pagePath(result.journeyId, CONSIGNOR_SELECT_SLUG)}?q=denmark&page=1&selected=${ALPINE_DAIRY_ID}`

    expect(pickerFrom(result).rows.map((row) => row.viewHref)).toEqual([
      insAddressHrefReturningTo(DANISH_MEAT_ID, pickerReturn),
      insAddressHrefReturningTo('jutland-swine-aps', pickerReturn)
    ])
  })

  it('Should return to the page being shown and keep changing when the picker was opened to change an answer', async () => {
    setInsFrontendBaseUrl('http://ins.example')

    const result = await driveHandler(getConsignor, {
      query: { page: '2' },
      startingFrom: [openedFromChangeLink()]
    })

    expect(firstViewHrefOf(result)).toBe(
      insAddressHrefReturningTo(
        pickerFrom(result).rows[0].id,
        `${pagePath(result.journeyId, CONSIGNOR_SELECT_SLUG)}?page=2&change=1`
      )
    )
  })
})

describe('POST /consignors/select — recoverable save failure', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should re-render the picker when saving the selection fails', async () => {
    const failure = unavailableBackendError('save answers')
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', party: ALPINE_DAIRY_ID },
      startingFrom: [refusingSaves(failure)]
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
      startingFrom: [openedFromChangeLink()]
    })

    expect(result.response).toEqual({
      redirect: `${pagePath(result.journeyId, 'addresses')}?change=1`
    })
    expect(result.after.consignor).toMatchObject({
      name: ALPINE_DAIRY_NAME
    })
  })

  it('Should point Back at the hub still changing', async () => {
    const result = await driveHandler(getConsignor, {
      startingFrom: [openedFromChangeLink()]
    })

    expect(result.view.context.backLink).toBe(
      `${pagePath(result.journeyId, 'addresses')}?change=1`
    )
  })

  it('Should keep changing across a paged link, beside the search and the selection', async () => {
    const result = await driveHandler(getConsignor, {
      query: { page: '2', selected: DANISH_MEAT_ID },
      startingFrom: [openedFromChangeLink()]
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

  const postAmending = (payload, startingFrom = []) =>
    driveHandler(postConsignor, {
      seed: { consignor: HELD_CONSIGNOR },
      payload,
      startingFrom: [amendmentOpened(), ...startingFrom]
    })

  it('Should return a chosen party to the review from a Change link', async () => {
    const { journeyId, response } = await postAmending(
      { action: 'save', party: ALPINE_DAIRY_ID },
      [openedFromChangeLink()]
    )

    expect(response).toEqual({
      redirect: pagePath(journeyId, 'notification-view')
    })
  })

  it('Should return to the review when saved with nothing chosen and an answer held', async () => {
    const { journeyId, response } = await postAmending({ action: 'save' }, [
      openedFromChangeLink()
    ])

    expect(response).toEqual({
      redirect: pagePath(journeyId, 'notification-view')
    })
  })

  it('Should go on to the addresses hub, plain, from Save and continue', async () => {
    const { journeyId, response } = await postAmending({
      action: 'save',
      party: ALPINE_DAIRY_ID
    })

    expect(response).toEqual({ redirect: pagePath(journeyId, 'addresses') })
  })

  it('Should keep a draft going back to the addresses hub still changing', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', party: ALPINE_DAIRY_ID },
      startingFrom: [openedFromChangeLink()]
    })

    expect(result.response).toEqual({
      redirect: `${pagePath(result.journeyId, 'addresses')}?change=1`
    })
  })
})
