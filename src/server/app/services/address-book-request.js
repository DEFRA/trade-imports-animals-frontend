import { config } from '../../../config/config.js'
import { traceHeaders } from './http/trace-headers.js'
import { BackendRequestError } from './persistence/records/errors.js'

const addressBookUrl = () => config.get('tradeImportsAddressBookApi.baseUrl')

const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

/**
 * The absolute URL of a resource under the caller's organisation in the
 * address book, or one record of it.
 *
 * @param {string} resource the resource's path segment (e.g. 'addresses')
 * @param {string} organisationId the caller's organisation id
 * @param {string} [resourceId] the record's id, or undefined for the collection
 * @returns {string} the resource's URL
 * @throws {Error} if organisationId is missing
 */
export const addressBookResourceUrl = (
  resource,
  organisationId,
  resourceId
) => {
  if (!organisationId) {
    throw new Error(
      'Cannot reach the address book without an organisation: the signed-in session carries none'
    )
  }
  const base = `${addressBookUrl()}/organisation/${encodeURIComponent(organisationId)}/${resource}`
  return resourceId ? `${base}/${encodeURIComponent(resourceId)}` : base
}

/**
 * The headers every address-book request carries.
 *
 * @param {string} organisationId the caller's organisation id
 * @returns {Record<string, string>} the request headers
 */
export const addressBookHeaders = (organisationId) => ({
  ...traceHeaders('application/json'),
  [ORGANISATION_ID_HEADER]: organisationId
})

/**
 * Raises the backend's failure for an address-book response that was not ok.
 *
 * @param {string} what the operation being attempted, named in the error
 * @param {Response} response
 * @throws {BackendRequestError} when the response is not ok
 */
export const throwOnAddressBookError = (what, response) => {
  if (!response.ok) {
    throw new BackendRequestError(what, response)
  }
}
