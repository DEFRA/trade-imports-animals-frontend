import { SET_ID } from '../../../../set.js'
import { describe, expect, it } from 'vitest'

import {
  addressBookAnswering,
  addressBookPage,
  addressBookRequestUrls,
  authenticatedCredentials,
  driveHandler,
  listedAddress,
  refusingSaves,
  resetMocksAndConfigAfterTests,
  expectNoRefusalLogged,
  expectOneRefusalLogged,
  postHandlerOf,
  useStubbedJourney,
  unavailableBackendError
} from '../../../../../../engine/test-support.js'
import { useInsFrontendBaseUrl } from '../../../../../../../common/test-helpers/use-ins-frontend-base-url.js'
import { dispatchPages } from '../index.js'
import {
  itSendsBackToWhereTheTraderCameFrom,
  itSendsBackToWhereTheTraderCameFromOnRefusal
} from '../../test-support.js'
import { expectAddedAddressBannerShownOnce } from '../addresses/test-support.js'
import { addressesPage } from '../addresses/page.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import { STUB_BOOK } from '../../../../../../services/address-book/stub/index.js'
import { recordsHoldingRole } from '../../../../../../services/address-book/stub/test-support.js'
import { CONTACT_PARTY } from '../addresses/parties.js'
import { HELD_CONTACT } from './test-support.js'

import * as contact from './controller.js'

const get = contact.routes.find((route) => route.method === 'GET').handler
const post = postHandlerOf(contact)

const CONTACT = STUB_BOOK.find(
  (record) => record.name === 'Animal and Plant Health Agency'
)
const NOT_IN_THE_BOOK = 'not-a-real-contact'
const addressLineEndingAtPostcode = ({ addressLine1, townOrCity, postcode }) =>
  [addressLine1, townOrCity, postcode].join(', ')

describe('GET contact — select an address from the book', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should offer no INS add link in stub mode', async () => {
    const result = await driveHandler(get)

    expect(result.view.context.addAddressHref).toBeFalsy()
  })

  it('Should surface a not-found handshake error', async () => {
    const result = await driveHandler(get, {
      query: { handshakeError: 'not-found' }
    })

    expect(result.view.context.errorSummary.errorList[0].text).toContain(
      'could not be found'
    )
    expect(result.view.context.errorSummary.errorList[0].href).toBe(
      '#contactAddress'
    )
    expect(result.view.context.recoverableError).toBe(false)
  })

  it('Should surface an unavailable handshake error', async () => {
    const result = await driveHandler(get, {
      query: { handshakeError: 'unavailable' }
    })

    expect(result.view.context.errorSummary.errorList[0].text).toContain(
      'could not be reached'
    )
    expect(result.view.context.recoverableError).toBe(true)
  })

  it('Should commit a copy of the picked address and show that option chosen on return', async () => {
    const postResult = await driveHandler(post, {
      payload: { contactAddress: CONTACT.id }
    })
    expect(postResult.view).toBeUndefined()
    expect(postResult.after.contactAddress).toMatchObject({
      pickedFromId: CONTACT.id,
      name: CONTACT.name
    })
    expect(postResult.after.contactAddress.address).toBeDefined()

    const getResult = await driveHandler(get, { seed: postResult.after })
    const { contactOptions } = getResult.view.context
    expect(
      contactOptions
        .filter((option) => option.checked)
        .map(({ value }) => value)
    ).toEqual([CONTACT.id])
  })

  it("Should offer only the organisation's branch addresses, each hinted with its address ending at the postcode, and no other party from the book", async () => {
    const result = await driveHandler(get)

    const branchRecords = recordsHoldingRole(CONTACT_PARTY.addressBookRole)
    expect(result.view.context.contactOptions).toEqual(
      branchRecords.map((record) => ({
        value: record.id,
        text: record.name,
        hint: { text: addressLineEndingAtPostcode(record.address) },
        checked: false
      }))
    )
  })

  it('Should select nothing when the record the contact was picked from is gone', async () => {
    const result = await driveHandler(get, {
      seed: { contactAddress: { ...HELD_CONTACT, pickedFromId: 'gone' } }
    })

    const { contactOptions, errorSummary } = result.view.context
    expect(contactOptions.every((option) => !option.checked)).toBe(true)
    expect(errorSummary).toBeNull()
  })

  it('Should select nothing for a contact whose details were edited here', async () => {
    const result = await driveHandler(get, {
      seed: { contactAddress: HELD_CONTACT }
    })

    expect(
      result.view.context.contactOptions.every((option) => !option.checked)
    ).toBe(true)
  })

  it('Should answer 400 and re-render with the choice in error when nothing is selected, leaving a held contact address as it was', async () => {
    const result = await driveHandler(post, {
      seed: { contactAddress: HELD_CONTACT },
      payload: {}
    })

    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.view.context.errors.contactAddress).toBeDefined()
    expect(result.after.contactAddress).toEqual(HELD_CONTACT)
  })

  it('Should answer 400 with the choice in error and commit nothing when nothing is selected and no contact address is held', async () => {
    const result = await driveHandler(post, {
      payload: { exit: 'hub' }
    })

    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.view.context.errors.contactAddress).toBeDefined()
    expect(result.after.contactAddress).toBeUndefined()
    expectNoRefusalLogged(result.logger)
  })
})

describe('GET contact — added address banner', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should show the added address banner with the address name, then clear its cookie so it shows only once', async () => {
    await expectAddedAddressBannerShownOnce(get)
  })
})

describe('POST contact — invalid payload', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should answer 400 and re-render an out-of-list contact, logging the refusal and committing nothing', async () => {
    const result = await driveHandler(post, {
      payload: { contactAddress: NOT_IN_THE_BOOK }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.contactAddress).toBeDefined()
    expect(result.after).toEqual(result.before)
    expectOneRefusalLogged(result.logger, {
      journeyId: result.journeyId,
      errorCodes: ['contactAddress'],
      partyId: CONTACT_PARTY.id,
      addressId: NOT_IN_THE_BOOK
    })
  })

  it('Should refuse an address held for a consignment role, not the contact role, logging the refusal', async () => {
    const [consignmentRoleRecord] = recordsHoldingRole('CONSIGNOR')

    const result = await driveHandler(post, {
      payload: { contactAddress: consignmentRoleRecord.id }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.contactAddress).toBeDefined()
    expect(result.after).toEqual(result.before)
    expectOneRefusalLogged(result.logger, {
      journeyId: result.journeyId,
      errorCodes: ['contactAddress'],
      partyId: CONTACT_PARTY.id,
      addressId: consignmentRoleRecord.id
    })
  })

  it('Should treat a dangling contact addressId as unselected on GET and reject it on POST', async () => {
    const seed = { contactAddress: { addressId: 'gone' } }

    const getResult = await driveHandler(get, { seed })
    expect(
      getResult.view.context.contactOptions.every((option) => !option.checked)
    ).toBe(true)

    const postResult = await driveHandler(post, {
      seed,
      payload: { contactAddress: 'gone' }
    })
    expect(postResult.response.statusCode).toBe(400)
    expect(postResult.view.context.errors.contactAddress).toBeDefined()
    expect(postResult.after).toEqual(postResult.before)
  })
})

describe('GET contact — INS add-address link', () => {
  useStubbedJourney(SET_ID, dispatchPages)
  resetMocksAndConfigAfterTests()
  const setInsFrontendBaseUrl = useInsFrontendBaseUrl()

  it('Should offer an INS add-address link when not in stub mode', async () => {
    setInsFrontendBaseUrl('http://localhost:3002')
    addressBookAnswering(addressBookPage())

    const result = await driveHandler(get)

    expect(result.view.context.addAddressHref).toContain(
      'http://localhost:3002/address-book/add'
    )
    expect(result.view.context.addAddressHref).toContain('journey-type=gbn-ag')
    expect(result.view.context.addAddressHref).toContain(
      `notification-id=${result.journeyId}`
    )
    expect(result.view.context.addAddressHref).toContain('fulfilment-id=')
  })
})

describe('POST contact — against the address book', () => {
  useStubbedJourney(SET_ID, dispatchPages)
  resetMocksAndConfigAfterTests()

  const BOOK_CONTACT = listedAddress('book-contact', 'Book Contact', {
    countryCode: 'GB'
  })
  const answeringOneAddress = (record) =>
    addressBookAnswering((request) =>
      request.url.endsWith(`/addresses/${record.id}`)
        ? { body: JSON.stringify(record) }
        : addressBookPage(record.deleted ? [] : [record])
    )

  it('Should save the picked contact after reading only that address', async () => {
    answeringOneAddress(BOOK_CONTACT)

    const result = await driveHandler(post, {
      payload: { contactAddress: BOOK_CONTACT.id }
    })

    expect(result.after.contactAddress).toMatchObject({
      pickedFromId: BOOK_CONTACT.id,
      name: BOOK_CONTACT.name
    })
    const [onlyRequest, ...others] = addressBookRequestUrls()
    expect(others).toEqual([])
    expect(onlyRequest).toMatch(
      new RegExp(
        `/organisation/${authenticatedCredentials.organisationId}/addresses/book-contact$`
      )
    )
  })

  it('Should answer 400 and commit nothing when the picked address has been deleted', async () => {
    answeringOneAddress({ ...BOOK_CONTACT, deleted: true })

    const result = await driveHandler(post, {
      payload: { contactAddress: BOOK_CONTACT.id }
    })

    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.view.context.errors.contactAddress).toBeDefined()
    expect(result.after).toEqual(result.before)
  })

  it('Should answer 400 and commit nothing when the picked address is held for a consignment role, not the contact role', async () => {
    const CONSIGNOR_CONTACT = listedAddress(
      'held-as-consignor',
      'Held As Consignor',
      { countryCode: 'GB', roles: ['CONSIGNOR'] }
    )
    answeringOneAddress(CONSIGNOR_CONTACT)

    const result = await driveHandler(post, {
      payload: { contactAddress: CONSIGNOR_CONTACT.id }
    })

    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.view.context.errors.contactAddress).toBeDefined()
    expect(result.after).toEqual(result.before)
  })
})

describe('POST contact — recoverable save failure', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should re-render the page when saving the selection fails', async () => {
    const result = await driveHandler(post, {
      payload: { contactAddress: CONTACT.id },
      startingFrom: [refusingSaves(unavailableBackendError('save answers'))]
    })

    expect(result.response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after.contactAddress).toBeUndefined()
  })

  it('Should keep a held contact address when saving the selection fails', async () => {
    const result = await driveHandler(post, {
      seed: { contactAddress: HELD_CONTACT },
      payload: { contactAddress: CONTACT.id },
      startingFrom: [refusingSaves(unavailableBackendError('save answers'))]
    })

    expect(result.response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(result.after.contactAddress).toEqual(HELD_CONTACT)
  })
})

describe('contact — Back link', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  itSendsBackToWhereTheTraderCameFrom(get, { previousPage: addressesPage.slug })

  itSendsBackToWhereTheTraderCameFromOnRefusal(post, {
    savedPage: addressesPage.slug,
    payload: { contactAddress: NOT_IN_THE_BOOK }
  })
})
