import { SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'

import {
  addressBookAnswering,
  addressBookCountriesServing,
  addressBookRequestUrls,
  driveHandler,
  expectOneRefusalLogged,
  expectOneSaveFallbackLogged,
  resetMocksAndConfigAfterTests,
  unavailableBackendError,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../../lib/http-status.js'
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

const handlerFor = (method, party) =>
  partyEdit.routes.find(
    (route) => route.method === method && route.path.endsWith(party.editSlug)
  ).handler

describe.each(ALL_PARTIES)('Edit $id address details', (party) => {
  useStubbedJourney(SET_ID, dispatchPages)
  resetMocksAndConfigAfterTests()

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

  it('Should send the trader to pick an address, saving nothing, when a save arrives with no copy', async () => {
    const result = await driveHandler(post, {
      payload: FORM,
      query: { change: '1' }
    })

    expect(result.response).toEqual({
      redirect: `${pagePath(result.journeyId, party.slug)}?change=1`
    })
    expect(result.after[party.id]).toBeUndefined()
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

  it('Should forget which record the copy was picked from, so the picker no longer pre-selects it', async () => {
    const result = await driveHandler(post, {
      seed: { [party.id]: { ...STORED, pickedFromId: 'origin-farm' } },
      payload: FORM
    })

    expect(result.after[party.id]).not.toHaveProperty('pickedFromId')
  })

  it('Should change only this notification, never the address book', async () => {
    addressBookAnswering({ status: 500 })

    const result = await driveHandler(post, {
      seed: { [party.id]: STORED },
      payload: FORM
    })

    expect(result.after[party.id].name).toBe(FORM.name)
    expect(addressBookRequestUrls()).toEqual([])
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
    expectOneRefusalLogged(result.logger, {
      journeyId: result.journeyId,
      errorCodes: ['postcode', 'email']
    })
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
  useStubbedJourney(SET_ID, dispatchPages)
  resetMocksAndConfigAfterTests()

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
    addressBookCountriesServing()

    const result = await driveHandler(post, {
      seed: { consignor: STORED },
      payload: { ...FORM, countryCode: 'US' }
    })

    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, 'addresses')
    })
    expect(result.after.consignor.address.countryCode).toBe('US')
  })

  it('Should offer the address-book country list on the form', async () => {
    addressBookCountriesServing()

    const result = await driveHandler(get, { seed: { consignor: STORED } })

    expect(result.view.context.countryItems).toContainEqual({
      value: 'US',
      text: 'United States'
    })
  })

  it('Should re-render the form when saving fails', async () => {
    const failure = unavailableBackendError('save answers')
    const result = await driveHandler(post, {
      seed: { consignor: STORED },
      payload: FORM,
      saveFailure: failure
    })

    expect(result.response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after.consignor).toEqual(STORED)
    expectOneSaveFallbackLogged(result.logger, {
      journeyId: result.journeyId,
      err: failure
    })
  })
})
