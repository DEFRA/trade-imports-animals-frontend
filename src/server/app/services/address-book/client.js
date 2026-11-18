import { addressBookCountryName } from '../countries/index.js'
import { HTTP_STATUS_NOT_FOUND } from '../../lib/http-status.js'
import {
  addressBookFetch,
  addressBookHeaders,
  addressBookResourceUrl,
  sendToAddressBook,
  throwOnAddressBookError
} from '../address-book-request.js'

const addressesUrl = (orgId, addressId) =>
  addressBookResourceUrl('addresses', orgId, addressId)

const toRecord = async (addressItem) => ({
  id: addressItem.id,
  name: addressItem.name,
  deleted: Boolean(addressItem.deleted),
  roles: addressItem.roles,
  address: {
    addressLine1: addressItem.addressLine1,
    addressLine2: addressItem.addressLine2,
    townOrCity: addressItem.townOrCity,
    county: addressItem.county,
    postcode: addressItem.postcode,
    countryCode: addressItem.countryCode,
    country: await addressBookCountryName(addressItem.countryCode),
    phone: addressItem.phone,
    email: addressItem.email
  }
})

/** The largest page size the address book serves. */
export const MAX_API_PAGE_SIZE = 100

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

  const response = await sendToAddressBook('list-addresses', url.toString(), {
    method: 'GET',
    headers: addressBookHeaders(orgId)
  })

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
  const operation = 'get-address'
  const response = await addressBookFetch(
    operation,
    addressesUrl(orgId, addressId),
    {
      method: 'GET',
      headers: addressBookHeaders(orgId)
    }
  )

  if (response.status === HTTP_STATUS_NOT_FOUND) {
    return undefined
  }
  throwOnAddressBookError(operation, response)

  return toRecord(await response.json())
}
