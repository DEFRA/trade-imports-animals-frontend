import Boom from '@hapi/boom'
import { isStubMode } from '../../../../../common/services/mode.js'
import { postSpeciesCheck } from './client.js'
import { COMMODITY_GROUPS } from './stub.js'

const listedInStub = ({ code, latinName }) =>
  COMMODITY_GROUPS.some(
    (group) =>
      group.code === code &&
      group.species.some((species) => species.latinName === latinName)
  )

/**
 * The lines whose species MDM no longer lists under their code, as
 * `[{ code, latinName }]` — empty when every line still stands. A rename
 * reads as a removal: the old name is no longer listed. Stub runs check
 * against the saved TST data instead of reference-data.
 *
 * @param {Array<{code: string, latinName: string}>} lines - the lines to check.
 * @returns {Promise<Array<{code: string, latinName: string}>>} the lines MDM no longer lists.
 */
export const missingSpecies = async (lines) => {
  if (lines.length === 0) {
    return []
  }
  if (isStubMode()) {
    return lines.filter((line) => !listedInStub(line))
  }
  try {
    return (await postSpeciesCheck(lines)).missing ?? []
  } catch (err) {
    throw Boom.serverUnavailable('Reference data unavailable', {
      dataset: 'commodities',
      cause: err
    })
  }
}
