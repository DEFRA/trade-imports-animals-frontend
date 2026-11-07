import { config } from '../../../../config/config.js'
import { traceHeaders } from '../http/trace-headers.js'
import { BackendRequestError } from '../persistence/records/errors.js'

const addressBookUrl = () => config.get('tradeImportsAddressBookApi.baseUrl')

const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

const transportersUrl = (orgId) => {
  if (!orgId) {
    throw new Error(
      'Cannot reach the address book without an organisation: the signed-in session carries none'
    )
  }
  return `${addressBookUrl()}/organisation/${encodeURIComponent(orgId)}/transporters`
}

const headers = (orgId) => ({
  ...traceHeaders('application/json'),
  [ORGANISATION_ID_HEADER]: orgId
})

const failed = (what, response) => new BackendRequestError(what, response)

/** Every live transporter the address book holds for the organisation,
 * newest first. */
export const listTransporters = async (orgId) => {
  const url = new URL(transportersUrl(orgId))
  url.searchParams.set('pageSize', '100')

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: headers(orgId)
  })

  if (!response.ok) {
    throw failed('list transporters', response)
  }

  const body = await response.json()
  return body.items
}

/** Creates a transporter in the organisation's address book. */
export const createTransporter = async (orgId, transporter) => {
  const response = await fetch(transportersUrl(orgId), {
    method: 'POST',
    headers: headers(orgId),
    body: JSON.stringify(transporter)
  })

  if (!response.ok) {
    throw failed('create transporter', response)
  }

  return response.json()
}
