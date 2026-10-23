import { commoditiesFromStubOrReferenceData } from './stub-or-reference-data.js'
import { checkSpecies } from './client.js'
import { COMMODITY_GROUPS } from './stub.js'

const listedInStub = ({ code, latinName }) =>
  COMMODITY_GROUPS.some(
    (group) =>
      group.code === code &&
      group.species.some((species) => species.latinName === latinName)
  )

/**
 * @param {Array<{code: string, latinName: string}>} lines - the lines to check.
 * @returns {Promise<Array<{code: string, latinName: string}>>} the lines whose
 *   Latin name is not listed under their code; empty when all are listed.
 * @throws {import('@hapi/boom').Boom} 503 when reference data fails.
 */
export const linesWithUnlistedSpecies = async (lines) => {
  if (lines.length === 0) {
    return []
  }
  return commoditiesFromStubOrReferenceData({
    stubCall: () => lines.filter((line) => !listedInStub(line)),
    realCall: async () => (await checkSpecies(lines)).unlisted ?? []
  })
}
