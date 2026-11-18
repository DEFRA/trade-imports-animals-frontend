import { config } from '../../../config/config.js'
import { measureExternalResponse } from '../../common/helpers/metrics/external-call-metrics.js'
import {
  ORGANISATION_ID_HEADER,
  organisationScopedHeaders
} from './http/organisation-headers.js'
import { BackendRequestError } from './persistence/records/errors.js'

const addressBookUrl = () => config.get('tradeImportsAddressBookApi.baseUrl')

export { ORGANISATION_ID_HEADER }

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
export const addressBookHeaders = (organisationId) =>
  organisationScopedHeaders(organisationId)

/**
 * Makes one call to the address book, recorded as one external call under the
 * operation it names.
 *
 * @param {string} operation the address-book operation, a fixed name such as `list-addresses`
 * @param {string} url the request URL
 * @param {RequestInit} init the fetch options, passed through unchanged
 * @returns {Promise<Response>} the address book's response
 */
export const addressBookFetch = (operation, url, init) =>
  measureExternalResponse({ dependency: 'address-book', operation }, () =>
    fetch(url, init)
  )

/**
 * Raises the address book's refusal of a call when its response was not ok.
 *
 * @param {string} operation the address-book operation the response answered, named in the error
 * @param {Response} response the address book's response
 * @throws {BackendRequestError} when the response is not ok
 */
export const throwOnAddressBookError = (operation, response) => {
  if (!response.ok) {
    throw new BackendRequestError(operation, response)
  }
}

/**
 * Makes one call to the address book, as {@link addressBookFetch} does, and
 * raises its refusal when the response is not ok.
 *
 * @param {string} operation the address-book operation, a fixed name such as `list-addresses`
 * @param {string} url the request URL
 * @param {RequestInit} init the fetch options, passed through unchanged
 * @returns {Promise<Response>} the address book's ok response
 * @throws {BackendRequestError} named for the operation, when the response is not ok
 */
export const sendToAddressBook = async (operation, url, init) => {
  const response = await addressBookFetch(operation, url, init)
  throwOnAddressBookError(operation, response)
  return response
}
