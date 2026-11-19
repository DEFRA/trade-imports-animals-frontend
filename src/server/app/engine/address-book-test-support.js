import { config } from '../../../config/config.js'
import { fetchMock } from './test-support.js'

/** Puts the address book on the network boundary: every request to its
 * `/addresses` or `/transporters` paths gets `addressResponse` (or, for a
 * function, what it returns for the request) and the country list gets the
 * United Kingdom, Switzerland and the United States. Call it inside a test;
 * pair it with `resetMocksAndConfigAfterTests()` in the describe. */
export const addressBookAnswering = (addressResponse) => {
  const countryList = JSON.stringify([
    { code: 'GB', name: 'United Kingdom' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'US', name: 'United States' }
  ])
  const answerAddresses = (request) =>
    typeof addressResponse === 'function'
      ? addressResponse(request)
      : addressResponse
  const isAddressBookResource = (url) =>
    url.includes('/addresses') || url.includes('/transporters')
  fetchMock.enableMocks()
  config.set('stubMode', false)
  fetchMock.mockResponse(async (request) =>
    isAddressBookResource(request.url)
      ? answerAddresses(request)
      : { body: countryList }
  )
}

/** An address book row as its search and lookup return it, live and holding
 * no role unless `overrides` says otherwise. */
export const listedAddress = (id, name, overrides = {}) => ({
  id,
  name,
  deleted: false,
  roles: [],
  addressLine1: '1 Test Lane',
  ...overrides
})

/** The address book's response to a search: one page holding every row
 * in `items`. Pass it to `addressBookAnswering()`. */
export const addressBookPage = (items = []) => ({
  body: JSON.stringify({
    items,
    page: 1,
    pageSize: 25,
    totalItems: items.length,
    totalPages: 1
  })
})

export const addressBookRefusingAddresses = () =>
  addressBookAnswering({ status: 500 })

/** The urls of the address book requests made since `addressBookAnswering()`. */
export const addressBookRequestUrls = () =>
  fetchMock
    .requests()
    .map((request) => request.url)
    .filter((url) => url.includes('/addresses'))
