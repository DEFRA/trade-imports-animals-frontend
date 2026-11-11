import { addressBookCountryName } from '../countries/index.js'
import { HTTP_STATUS_NOT_FOUND } from '../../lib/http-status.js'
import {
  addressBookHeaders,
  addressBookResourceUrl,
  throwOnAddressBookError
} from '../address-book-request.js'

/** The page size the address book serves when the request names none. */
export const API_PAGE_SIZE = 25

const addressesUrl = (orgId, addressId) =>
  addressBookResourceUrl('addresses', orgId, addressId)

const headers = addressBookHeaders

const toRecord = async (operator) => ({
  id: operator.id,
  name: operator.name,
  deleted: Boolean(operator.deleted),
  address: {
    addressLine1: operator.addressLine1,
    addressLine2: operator.addressLine2,
    townOrCity: operator.townOrCity,
    county: operator.county,
    postcode: operator.postcode,
    countryCode: operator.countryCode,
    country: await addressBookCountryName(operator.countryCode),
    phone: operator.phone,
    email: operator.email
  }
})

/** One page of the organisation's live addresses with its paging numbers. */
export const listAddresses = async (
  orgId,
  { page = 1, pageSize, query } = {}
) => {
  const url = new URL(addressesUrl(orgId))
  url.searchParams.set('page', String(page))
  if (pageSize) {
    url.searchParams.set('pageSize', String(pageSize))
  }
  if (query) {
    url.searchParams.set('q', query)
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: headers(orgId)
  })

  throwOnAddressBookError('list addresses', response)

  const body = await response.json()
  return {
    records: await Promise.all(body.items.map(toRecord)),
    page: body.page,
    pageSize: body.pageSize,
    totalItems: body.totalItems,
    totalPages: body.totalPages
  }
}

/** The address with the given id, a deleted one included and marked deleted, or nothing when the address book has none. */
export const getAddress = async (orgId, addressId) => {
  const response = await fetch(addressesUrl(orgId, addressId), {
    method: 'GET',
    headers: headers(orgId)
  })

  if (response.status === HTTP_STATUS_NOT_FOUND) {
    return undefined
  }
  throwOnAddressBookError('get address', response)

  return toRecord(await response.json())
}
