import { SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'
import { CYA_SLUG } from '../../../../../../../shared/kit.js'

import { store } from '../../../../../../../engine/store.js'
import {
  amendmentOpened,
  driveHandler,
  reviewChangeLinkQuery,
  refusingSaves,
  addressBookAnswering,
  addressBookPage,
  expectOneLogged,
  expectOneRefusalLogged,
  expectRecoverableSaveFallback,
  listedAddress,
  resetMocksAndConfigAfterTests,
  unavailableBackendError,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import { useInsFrontendBaseUrl } from '../../../../../../../../common/test-helpers/use-ins-frontend-base-url.js'
import { insViewAddressUrl } from '../../../../../../../../common/helpers/ins-address-book-urls.js'
import { dispatchPages } from '../../index.js'
import { pagePath } from '../../../../../../../shared/paths.js'

import * as partyPicker from './party-picker.controller.js'
import { PARTIES } from '../parties.js'
import { expectAddedAddressBannerShownOnce } from '../test-support.js'
import { STUB_BOOK } from '../../../../../../../services/address-book/stub/index.js'

const CONSIGNOR_SELECT_SLUG = 'consignors/select'
const NORDVIK_ID = 'nordvik-seafood'
const ALPINE_DAIRY_ID = 'alpine-dairy'
const ALPINE_DAIRY_NAME = 'Alpine Dairy GmbH'
const DANISH_MEAT_ID = 'danish-meat-export-aps'
const DANISH_MEAT_NAME = 'Danish Meat Export ApS'
const JUTLAND_SWINE_ID = 'jutland-swine-aps'
const NOT_IN_THE_BOOK = 'not-in-this-book'
const SELECT_A_CONSIGNOR_ERROR = 'Select a consignor from the list'

const listedFor = (role) =>
  STUB_BOOK.filter(
    (record) => record.roles.length === 0 || record.roles.includes(role)
  ).map((record) => record.id)

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

  it('Should list every consignor-role address, with the role-less address, and nothing else', async () => {
    const picker = pickerFrom(await driveHandler(getConsignor))

    expect(picker.resultsCount).toBe('Showing 9 out of 9 results')
    expect(idsOf(picker)).toEqual(listedFor('CONSIGNOR'))
    expect(picker.rows[0]).toMatchObject({
      name: 'Astra Rosales',
      country: 'Switzerland',
      checked: false
    })
    expect(picker.selected).toBeUndefined()
  })

  it('Should give each row its street lines and then its town and postcode on one line', async () => {
    const picker = pickerFrom(await driveHandler(getConsignor))

    expect(picker.rows.slice(0, 3).map((row) => row.addressLines)).toEqual([
      ['43 East Hague Extension', 'Bern, 30055'],
      ['Havnegade 21', 'Copenhagen, 1058'],
      ['Sondergade 4', 'Aarhus, 8000']
    ])
  })

  it('Should render the picker across the full width of the content column', async () => {
    const result = await driveHandler(getConsignor)

    expect(result.view.context.contentColumnClass).toBe(
      'govuk-grid-column-full'
    )
  })

  it('Should carry the selection into the View link return, with no page', async () => {
    const result = await driveHandler(getConsignor, {
      query: { selected: DANISH_MEAT_ID }
    })
    const picker = pickerFrom(result)

    expect(idsOf(picker)).toContain(NORDVIK_ID)
    expect(picker.selected.name).toBe(DANISH_MEAT_NAME)
  })

  it('Should filter the consignor list down to the search matches', async () => {
    const picker = pickerFrom(
      await driveHandler(getConsignor, { query: { q: 'denmark' } })
    )

    expect(picker.resultsCount).toBe('Showing 2 out of 2 results')
    expect(idsOf(picker)).toEqual([DANISH_MEAT_ID, JUTLAND_SWINE_ID])
  })

  it('Should open with the record the held copy was picked from selected', async () => {
    const result = await driveHandler(getConsignor, {
      seed: {
        consignor: { pickedFromId: DANISH_MEAT_ID, name: 'Copied Name' }
      }
    })
    const picker = pickerFrom(result)

    expect(picker.selected.name).toBe(DANISH_MEAT_NAME)
    expect(picker.rows.find((row) => row.id === DANISH_MEAT_ID).checked).toBe(
      true
    )
  })

  it('Should open with nothing selected when the held copy has no record it was picked from', async () => {
    const picker = pickerFrom(
      await driveHandler(getConsignor, {
        seed: { consignor: { name: ALPINE_DAIRY_NAME } }
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

  it('Should re-render the consignor matches on a search, saving nothing', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'search', q: 'Copenhagen' }
    })
    const picker = pickerFrom(result)

    expect(result.response.statusCode).toBe(200)
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

  it('Should store a copy of the record, noting which record it was picked from', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', party: ALPINE_DAIRY_ID }
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, 'addresses')
    })
    expect(result.after.consignor).not.toHaveProperty('addressId')
    expect(result.after.consignor.pickedFromId).toBe(ALPINE_DAIRY_ID)
    expect(result.after.consignor.name).toBe(ALPINE_DAIRY_NAME)
    expect(result.after.consignor.address).toMatchObject({
      addressLine1: expect.any(String),
      countryCode: expect.any(String)
    })
  })

  it('Should save the selection carried in the hidden field when the page on screen has no row ticked', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', selected: NORDVIK_ID }
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

  it('Should let a row ticked on screen beat a selection carried in the hidden field', async () => {
    const result = await driveHandler(postConsignor, {
      payload: {
        action: 'save',
        selected: NORDVIK_ID,
        party: ALPINE_DAIRY_ID
      }
    })

    expect(result.after.consignor).toMatchObject({ name: ALPINE_DAIRY_NAME })
  })

  it('Should return to the addresses page with the consignor still empty when saved with nothing selected', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save' }
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, 'addresses')
    })
    expect(result.after.consignor).toBeUndefined()
    expectOneLogged(result.logger, {
      level: 'info',
      fields: { journeyId: result.journeyId, party: 'consignor' },
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
      party: 'consignor',
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

describe('The five spokes share the one picker, each filtered to its own role', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should commit the record its own role was asked for, to its own obligation', async () => {
    for (const party of PARTIES) {
      store.clear()
      const result = await driveHandler(handlerFor('GET', party.slug))
      const [firstRow] = pickerFrom(result).rows

      const posted = await driveHandler(handlerFor('POST', party.slug), {
        payload: { action: 'save', party: firstRow.id }
      })

      expect(posted.after[party.id]).toMatchObject({ name: firstRow.name })
      expect(posted.response).toEqual({
        redirect: pagePath(posted.journeyId, 'addresses')
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

  it('Should give each spoke the stub records carrying its own role, with the role-less record, and nothing else', async () => {
    const seen = []
    for (const party of PARTIES) {
      const result = await driveHandler(handlerFor('GET', party.slug))
      seen.push(idsOf(result.view.context.picker))
    }

    expect(seen).toEqual(
      PARTIES.map((party) => listedFor(party.addressBookRole))
    )
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

  const addressBookListing = (items) =>
    addressBookAnswering((request) =>
      request.url.includes(`/addresses/${ALPINE_DAIRY_ID}`)
        ? {
            body: JSON.stringify(
              listedAddress(ALPINE_DAIRY_ID, ALPINE_DAIRY_NAME)
            )
          }
        : addressBookPage(items)
    )

  it('Should link each row to its INS address page, returning to this picker with its search and selection', async () => {
    setInsFrontendBaseUrl('http://ins.example/')
    addressBookListing([
      listedAddress(DANISH_MEAT_ID, DANISH_MEAT_NAME),
      listedAddress(JUTLAND_SWINE_ID, 'Jutland Swine ApS')
    ])

    const result = await driveHandler(getConsignor, {
      query: { q: 'denmark', selected: ALPINE_DAIRY_ID }
    })

    const pickerReturn = `${pagePath(result.journeyId, CONSIGNOR_SELECT_SLUG)}?q=denmark&selected=${ALPINE_DAIRY_ID}`

    expect(pickerFrom(result).rows.map((row) => row.viewHref)).toEqual([
      insViewAddressUrl(DANISH_MEAT_ID, pickerReturn),
      insViewAddressUrl(JUTLAND_SWINE_ID, pickerReturn)
    ])
  })

  it('Should return to the page being shown with its chosen address, carrying the trail, when the picker was opened from the review', async () => {
    setInsFrontendBaseUrl('http://ins.example')
    addressBookListing([listedAddress(DANISH_MEAT_ID, DANISH_MEAT_NAME)])

    const result = await driveHandler(getConsignor, {
      query: {
        selected: ALPINE_DAIRY_ID,
        ...reviewChangeLinkQuery()
      }
    })

    expect(pickerFrom(result).rows[0].viewHref).toBe(
      insViewAddressUrl(
        DANISH_MEAT_ID,
        `${pagePath(result.journeyId, CONSIGNOR_SELECT_SLUG)}?selected=${ALPINE_DAIRY_ID}&from=${CYA_SLUG}`
      )
    )
  })

  it('Should end each row at its country, with no View link, in stub mode', async () => {
    const result = await driveHandler(getConsignor)

    const picker = pickerFrom(result)

    expect(picker.withViewLinks).toBe(false)
    expect(picker.rows[0]).toEqual({
      id: picker.rows[0].id,
      idPrefix: 'party',
      name: picker.rows[0].name,
      addressLines: picker.rows[0].addressLines,
      country: picker.rows[0].country,
      checked: false
    })
    expect(picker.tableRows[0].at(-1)).toEqual({
      text: picker.rows[0].country
    })
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

    expect(result.after.consignor).toBeUndefined()
    expectRecoverableSaveFallback(result, {
      err: failure,
      party: 'consignor',
      addressId: ALPINE_DAIRY_ID
    })
  })
})

describe('/consignors/select — the trail', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should hand the save back to the hub carrying the trail', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', party: ALPINE_DAIRY_ID },
      startingFrom: [{ query: reviewChangeLinkQuery() }]
    })

    expect(result.response).toEqual({
      redirect: `${pagePath(result.journeyId, 'addresses')}?from=${CYA_SLUG}`
    })
    expect(result.after.consignor).toMatchObject({
      name: ALPINE_DAIRY_NAME
    })
  })

  it('Should point Back at the hub carrying the trail', async () => {
    const result = await driveHandler(getConsignor, {
      startingFrom: [{ query: reviewChangeLinkQuery() }]
    })

    expect(result.view.context.backLink).toBe(
      `${pagePath(result.journeyId, 'addresses')}?from=${CYA_SLUG}`
    )
  })
})

describe('/consignors/select — Save and continue while amending', () => {
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

  it('Should go on to the addresses hub, plain, from Save and continue', async () => {
    const { journeyId, response } = await postAmending({
      action: 'save',
      party: ALPINE_DAIRY_ID
    })

    expect(response).toEqual({ redirect: pagePath(journeyId, 'addresses') })
  })

  it('Should keep a draft going back to the addresses hub carrying the trail', async () => {
    const result = await driveHandler(postConsignor, {
      payload: { action: 'save', party: ALPINE_DAIRY_ID },
      startingFrom: [{ query: reviewChangeLinkQuery() }]
    })

    expect(result.response).toEqual({
      redirect: `${pagePath(result.journeyId, 'addresses')}?from=${CYA_SLUG}`
    })
  })
})
