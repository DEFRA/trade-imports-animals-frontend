import { isStubMode } from '../../../common/services/mode.js'
import * as client from './client.js'
import * as stub from './stub.js'

/**
 * The signed-in user's saved notification templates, newest saved first.
 *
 * @param {string} ownerId - the signed-in user's id
 * @returns {Promise<Array<{ id: string, name: string, setId: string, created: string }>>} the user's templates
 */
export const listFor = async (ownerId) => {
  if (!ownerId) {
    throw new Error(
      'Cannot list templates without an owner: the signed-in session carries none'
    )
  }
  return isStubMode() ? stub.list(ownerId) : client.listTemplates(ownerId)
}
