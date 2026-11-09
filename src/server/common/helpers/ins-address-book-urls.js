import { buildInsFrontendUrl } from './frontend-url.js'

const ADDRESS_BOOK_PATH = '/address-book'

/**
 * The INS address book's list page.
 *
 * @returns {string} the browser-facing URL of the address book
 */
export const insAddressBookUrl = () => buildInsFrontendUrl(ADDRESS_BOOK_PATH)

/**
 * The INS address book's add-an-address page.
 *
 * @param {Record<string, string>} params - the query the add page reads
 * @returns {string} the browser-facing URL of the add page with that query
 */
export const insAddAddressUrl = (params) =>
  buildInsFrontendUrl(`${ADDRESS_BOOK_PATH}/add?${new URLSearchParams(params)}`)

/**
 * The INS address book's page for one address.
 *
 * @param {string} addressId - the address book record's id
 * @param {string} returnPath - where the page's back link returns to
 * @returns {string} the browser-facing URL of that address's page
 */
export const insViewAddressUrl = (addressId, returnPath) =>
  buildInsFrontendUrl(
    `${ADDRESS_BOOK_PATH}/${encodeURIComponent(addressId)}?${new URLSearchParams({ return: returnPath })}`
  )

/**
 * The INS address book's page for one transporter.
 *
 * @param {string} transporterId - the address book record's id
 * @param {string} returnPath - where the page's back link returns to
 * @returns {string} the browser-facing URL of that transporter's page
 */
export const insViewTransporterUrl = (transporterId, returnPath) =>
  buildInsFrontendUrl(
    `${ADDRESS_BOOK_PATH}/transporter/${encodeURIComponent(transporterId)}?${new URLSearchParams({ return: returnPath })}`
  )
