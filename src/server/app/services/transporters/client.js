import {
  addressBookHeaders,
  addressBookResourceUrl,
  throwOnAddressBookError
} from '../address-book-request.js'

const transportersUrl = (orgId) => addressBookResourceUrl('transporters', orgId)

const headers = addressBookHeaders

const MAX_PAGE_SIZE = 100

const transportersPage = async (orgId, page) => {
  const url = new URL(transportersUrl(orgId))
  url.searchParams.set('pageSize', String(MAX_PAGE_SIZE))
  url.searchParams.set('page', String(page))

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: headers(orgId)
  })

  throwOnAddressBookError('list transporters', response)

  return response.json()
}

/** Every live transporter the address book holds for the organisation,
 * newest first, read a page at a time until every page the address book
 * reports has been fetched. */
export const listTransporters = async (orgId) => {
  const items = []
  let page = 1
  let totalPages = 1
  do {
    const body = await transportersPage(orgId, page)
    items.push(...body.items)
    totalPages = body.totalPages
    page += 1
  } while (page <= totalPages)

  return items
}

/** Creates a transporter in the organisation's address book. */
export const createTransporter = async (orgId, transporter) => {
  const response = await fetch(transportersUrl(orgId), {
    method: 'POST',
    headers: headers(orgId),
    body: JSON.stringify(transporter)
  })

  throwOnAddressBookError('create transporter', response)

  return response.json()
}
