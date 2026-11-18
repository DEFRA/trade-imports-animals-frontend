import {
  addressBookHeaders,
  addressBookResourceUrl,
  sendToAddressBook
} from '../address-book-request.js'

const transportersUrl = (orgId) => addressBookResourceUrl('transporters', orgId)

const transportersPage = async (orgId, page) => {
  const maxPageSize = 100
  const url = new URL(transportersUrl(orgId))
  url.searchParams.set('pageSize', String(maxPageSize))
  url.searchParams.set('page', String(page))

  const response = await sendToAddressBook(
    'list-transporters',
    url.toString(),
    {
      method: 'GET',
      headers: addressBookHeaders(orgId)
    }
  )

  return response.json()
}

/** Every live transporter the address book holds for the organisation. */
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
  const response = await sendToAddressBook(
    'create-transporter',
    transportersUrl(orgId),
    {
      method: 'POST',
      headers: addressBookHeaders(orgId),
      body: JSON.stringify(transporter)
    }
  )

  return response.json()
}
