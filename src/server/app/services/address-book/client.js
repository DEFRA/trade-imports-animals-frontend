import { originLabel } from '../countries/index.js'
import { HTTP_STATUS_NOT_FOUND } from '../../lib/http-status.js'
import { BackendRequestError } from '../persistence/records/errors.js'

const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

const addressBookUrl =
  process.env.TRADE_IMPORTS_ADDRESS_BOOK_URL ?? 'http://localhost:8089'

/** Page size the API serves. Server-owned (cv-025) — it is deliberately not a
 * request parameter, so the service re-slices to its own page size rather than
 * asking for one. Read back off each response in case the server is configured
 * differently. */
export const API_PAGE_SIZE = 25

/** The organisation is part of the path, so a missing one does not fail — it
 * asks for an organisation literally named "undefined", which the address book
 * answers truthfully with an empty book. That reads as "this organisation has
 * saved no addresses", or on a resolve as "this address was deleted", when what
 * actually happened is that nobody was signed in. Refuse instead: a read with
 * no organisation is a bug in the caller, and it should say so. */
const addressesUrl = (orgId, addressId) => {
  if (!orgId) {
    throw new Error(
      'Cannot reach the address book without an organisation: the signed-in session carries none'
    )
  }
  const base = `${addressBookUrl}/organisation/${encodeURIComponent(orgId)}/addresses`
  return addressId ? `${base}/${encodeURIComponent(addressId)}` : base
}

/** The organisation is the authorisation — the address book runs no in-service
 * authentication and trusts this header (see its IdentityHeaderFilter). It must
 * always come from the authenticated session, never a payload or a stored
 * field, and it must match the orgId in the path (cv-010). */
const headers = (orgId) => ({
  'Content-Type': 'application/json',
  [ORGANISATION_ID_HEADER]: orgId
})

const failed = (what, response) => new BackendRequestError(what, response)

/** Wire shape to the shape the journey renders. The API is the system of
 * record and uses its own names (`postcode`, `countryCode`, `phone`, `email`);
 * the journey has carried `postalOrZipCode`/`country` since before it existed
 * and is read by two renderers plus templates. Only the addressId crosses to
 * the backend, so the display shape never has to match the wire — mapping here
 * is cheaper than renaming the journey. */
const toRecord = (operator) => ({
  id: operator.id,
  name: operator.name,
  deleted: Boolean(operator.deleted),
  address: {
    addressLine1: operator.addressLine1,
    addressLine2: operator.addressLine2,
    townOrCity: operator.townOrCity,
    county: operator.county,
    postalOrZipCode: operator.postcode,
    country: originLabel(operator.countryCode) ?? operator.countryCode,
    // Contact details sit inside the address block, which is where the journey
    // has always read them from.
    telephoneNumber: operator.phone,
    emailAddress: operator.email
  }
})

/** One API page of the organisation's live addresses. Soft-deleted records are
 * already excluded by the API, which is what keeps deleted addresses off the
 * search pages (AC2). */
export const listAddresses = async (orgId, { page = 1, query } = {}) => {
  const url = new URL(addressesUrl(orgId))
  url.searchParams.set('page', String(page))
  if (query) {
    url.searchParams.set('q', query)
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: headers(orgId)
  })

  if (!response.ok) {
    throw failed('list addresses', response)
  }

  const body = await response.json()
  return {
    records: body.items.map(toRecord),
    page: body.page,
    pageSize: body.pageSize,
    totalItems: body.totalItems,
    totalPages: body.totalPages
  }
}

/** One address by id, including a soft-deleted tombstone — the API answers 200
 * with `deleted: true` rather than 404, so a caller can tell a deletion from a
 * record that never existed. Returns undefined only for a genuine 404. */
export const getAddress = async (orgId, id) => {
  const response = await fetch(addressesUrl(orgId, id), {
    method: 'GET',
    headers: headers(orgId)
  })

  if (response.status === HTTP_STATUS_NOT_FOUND) {
    return undefined
  }
  if (!response.ok) {
    throw failed('get address', response)
  }

  return toRecord(await response.json())
}
