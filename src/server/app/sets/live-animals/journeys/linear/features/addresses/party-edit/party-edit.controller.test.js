import { SET_ID } from '../../../../../set.js'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import { driveHandler } from '../../../../../../../engine/test-support.js'
import * as state from '../../../../../../../engine/index.js'
import * as addressBook from '../../../../../../../services/address-book/index.js'
import * as countries from '../../../../../../../services/countries/index.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../../lib/http-status.js'
import { BackendRequestError } from '../../../../../../../services/persistence/records/errors.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import { dispatchPages } from '../../index.js'
import { CONTACT_PARTY, PARTIES } from '../parties.js'
import * as partyEdit from './party-edit.controller.js'

const ALL_PARTIES = [...PARTIES, CONTACT_PARTY]
const REVIEW_SLUG = 'notification-view'

const STORED = {
  name: 'Astra Rosales',
  phone: '01632 960000',
  email: 'astra@example.com',
  address: {
    addressLine1: '43 East Hague Extension',
    addressLine2: '',
    townOrCity: 'Bern',
    county: '',
    postcode: '30055',
    countryCode: 'CH'
  }
}

const FORM = {
  name: 'Astra Rosales AG',
  addressLine1: '45 East Hague Extension',
  addressLine2: 'Floor 2',
  townOrCity: 'Bern',
  county: 'Bern',
  postcode: '30056',
  countryCode: 'CH',
  phone: '01632 960001',
  email: 'office@astra.example.com'
}

// US sits outside the SPS origin block but is in the address book's list.
const ADDRESS_BOOK_COUNTRIES = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' }
]

const handlerFor = (method, party) =>
  partyEdit.routes.find(
    (route) => route.method === method && route.path.endsWith(party.editSlug)
  ).handler

const configure = () => {
  configureRecords(SET_ID, recordsStub)
  configureSession(SET_ID, sessionStub)
  buildDispatch(SET_ID, dispatchPages)
}

describe.each(ALL_PARTIES)('Edit $id address details', (party) => {
  beforeAll(configure)
  beforeEach(() => store.clear())
  afterEach(() => vi.restoreAllMocks())

  const get = handlerFor('GET', party)
  const post = handlerFor('POST', party)

  it('Should pre-fill the form from the copy held on the notification', async () => {
    const result = await driveHandler(get, { seed: { [party.id]: STORED } })
    const { values, partyTitle } = result.view.context

    expect(partyTitle).toBe(party.title)
    expect(values).toEqual({
      name: 'Astra Rosales',
      addressLine1: '43 East Hague Extension',
      addressLine2: '',
      townOrCity: 'Bern',
      county: '',
      postcode: '30055',
      countryCode: 'CH',
      phone: '01632 960000',
      email: 'astra@example.com'
    })
  })

  it('Should send the trader to pick an address when none has been copied yet', async () => {
    const result = await driveHandler(get)

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, party.slug)
    })
  })

  it('Should save the edited copy and return to where the trader came from', async () => {
    const result = await driveHandler(post, {
      seed: { [party.id]: STORED },
      payload: FORM,
      query: { return: REVIEW_SLUG }
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, REVIEW_SLUG)
    })
    expect(result.after[party.id]).toEqual({
      name: 'Astra Rosales AG',
      phone: '01632 960001',
      email: 'office@astra.example.com',
      address: {
        addressLine1: '45 East Hague Extension',
        addressLine2: 'Floor 2',
        townOrCity: 'Bern',
        county: 'Bern',
        postcode: '30056',
        countryCode: 'CH'
      }
    })
  })

  it('Should change only this notification, never the address book', async () => {
    const partySpy = vi.spyOn(addressBook, 'party')
    const searchSpy = vi.spyOn(addressBook, 'search')

    await driveHandler(post, {
      seed: { [party.id]: STORED },
      payload: FORM
    })

    expect(partySpy).not.toHaveBeenCalled()
    expect(searchSpy).not.toHaveBeenCalled()
  })

  it('Should re-render with the address-book error messages and save nothing', async () => {
    const result = await driveHandler(post, {
      seed: { [party.id]: STORED },
      payload: { ...FORM, postcode: '', email: 'not-an-email' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors).toEqual({
      postcode: 'Enter a postcode',
      email: 'Enter an email address in the correct format'
    })
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: 'Enter a postcode', href: '#postcode' },
      {
        text: 'Enter an email address in the correct format',
        href: '#email'
      }
    ])
    expect(result.view.context.values.postcode).toBe('')
    expect(result.after[party.id]).toEqual(STORED)
  })

  it('Should leave the copy unchanged on Cancel', async () => {
    const result = await driveHandler(post, {
      seed: { [party.id]: STORED },
      payload: { ...FORM, cancel: 'true' }
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, party.returnSlug)
    })
    expect(result.after[party.id]).toEqual(STORED)
  })
})

describe('Edit address details — where the trader returns to', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

  const consignor = PARTIES.find((party) => party.id === 'consignor')
  const get = handlerFor('GET', consignor)
  const post = handlerFor('POST', consignor)

  it('Should point Back at the page named in the return parameter', async () => {
    const result = await driveHandler(get, {
      seed: { consignor: STORED },
      query: { return: REVIEW_SLUG }
    })

    expect(result.view.context.backLink).toBe(
      pagePath(result.journeyId, REVIEW_SLUG)
    )
  })

  it('Should keep the change context on the way back to the hub', async () => {
    const result = await driveHandler(post, {
      seed: { consignor: STORED },
      payload: FORM,
      query: { return: 'addresses', change: '1' }
    })

    expect(result.response).toEqual({
      redirect: `${pagePath(result.journeyId, 'addresses')}?change=1`
    })
  })

  it('Should ignore a return parameter that is not one of its own pages', async () => {
    const result = await driveHandler(post, {
      seed: { consignor: STORED },
      payload: FORM,
      query: { return: 'https://example.com/elsewhere' }
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, 'addresses')
    })
  })

  it('Should accept a country the address book allows outside the SPS origin block', async () => {
    vi.spyOn(countries, 'addressCountryOptions').mockResolvedValue(
      ADDRESS_BOOK_COUNTRIES
    )

    const result = await driveHandler(post, {
      seed: { consignor: STORED },
      payload: { ...FORM, countryCode: 'US' }
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, 'addresses')
    })
    expect(result.after.consignor.address.countryCode).toBe('US')
    vi.restoreAllMocks()
  })

  it('Should offer the address-book country list on the form', async () => {
    vi.spyOn(countries, 'addressCountryOptions').mockResolvedValue(
      ADDRESS_BOOK_COUNTRIES
    )

    const result = await driveHandler(get, { seed: { consignor: STORED } })

    expect(result.view.context.countryItems).toContainEqual({
      value: 'US',
      text: 'United States'
    })
    vi.restoreAllMocks()
  })

  it('Should re-render the form when saving fails', async () => {
    vi.spyOn(state, 'commit').mockRejectedValue(
      new BackendRequestError('save answers', {
        status: 503,
        statusText: 'Service Unavailable'
      })
    )

    const result = await driveHandler(post, {
      seed: { consignor: STORED },
      payload: FORM
    })

    expect(result.response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after.consignor).toEqual(STORED)
    vi.restoreAllMocks()
  })
})
