import { fromStubOrReferenceData } from './stub-or-reference-data.js'
import { checkSpecies } from './client.js'
import { unlistedLinesInStub } from './stub.js'

const unlistedFrom = ({ unlisted }) => {
  if (!Array.isArray(unlisted)) {
    throw new Error('Species check reply has no unlisted list')
  }
  return unlisted
}

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
  return fromStubOrReferenceData({
    stubCall: () => unlistedLinesInStub(lines),
    realCall: async () => unlistedFrom(await checkSpecies(lines)),
    dataset: 'species'
  })
}
