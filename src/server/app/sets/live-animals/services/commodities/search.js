import { commoditiesFromStubOrReferenceData } from './stub-or-reference-data.js'
import { fetchCommodities } from './client.js'
import { searchCommodities } from './stub.js'

/**
 * One page of the species matching a term, grouped by CN code.
 *
 * @param {string} term - the search term.
 * @param {{page?: number, size: number}} paging - the zero-based page and its size.
 * @returns {Promise<{total: number, page: number, size: number, groups: Array<{code: string, species: Array<{latinName: string, commonName: string|null}>}>}>} the page of results.
 * @throws {import('@hapi/boom').Boom} 503 when reference data fails.
 */
export const search = (term, { page = 0, size }) =>
  commoditiesFromStubOrReferenceData({
    stubCall: () => searchCommodities(term, { page, size }),
    realCall: () => fetchCommodities(term, { page, size })
  })
