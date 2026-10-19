import Boom from '@hapi/boom'
import { isStubMode } from '../../../../../common/services/mode.js'
import { fetchCommodities } from './client.js'
import { searchCommodities } from './stub.js'

/**
 * One page of MDM's species matching a term, grouped by CN code:
 * `{ total, page, size, groups: [{ code, species: [{ latinName, commonName }] }] }`.
 * Stub runs search the saved TST data instead of reference-data.
 *
 * Kept apart from the rules in ./index.js, which the obligations read at
 * load: only the search page needs to reach reference-data.
 */
export const search = async (term, { page = 0, size }) => {
  if (isStubMode()) {
    return searchCommodities(term, { page, size })
  }
  try {
    return await fetchCommodities(term, { page, size })
  } catch (err) {
    throw Boom.serverUnavailable('Reference data unavailable', {
      dataset: 'commodities',
      cause: err
    })
  }
}
