import { isStubMode } from '../../../common/services/mode.js'
import * as client from './client.js'
import * as stub from './stub.js'

const requireOwner = (ownerId, action) => {
  if (!ownerId) {
    throw new Error(
      `Cannot ${action} without an owner: the signed-in session carries none`
    )
  }
}

/**
 * The signed-in user's saved notification templates, newest saved first.
 *
 * @param {string} ownerId - the signed-in user's id
 * @returns {Promise<Array<{ id: string, name: string, setId: string, created: string }>>} the user's templates
 */
export const listFor = async (ownerId) => {
  requireOwner(ownerId, 'list templates')
  return isStubMode() ? stub.list(ownerId) : client.listTemplates(ownerId)
}

/**
 * Stores a new template for the signed-in user, held as in progress.
 *
 * @param {string} ownerId - the signed-in user's id
 * @param {{ setId: string, name: string, organisationId?: string }} details - the type, name and organisation to record
 * @returns {Promise<object>} the template as stored, with its id
 */
export const startFor = async (ownerId, details) => {
  requireOwner(ownerId, 'start a template')
  return isStubMode()
    ? stub.start(ownerId, details)
    : client.startTemplate(ownerId, details)
}

/**
 * One of the signed-in user's templates.
 *
 * @param {string} ownerId - the signed-in user's id
 * @param {string} id - the template's id
 * @returns {Promise<object|undefined>} the template, or undefined when the user has none by that id
 */
export const getFor = async (ownerId, id) => {
  requireOwner(ownerId, 'read a template')
  return isStubMode() ? stub.get(ownerId, id) : client.getTemplate(ownerId, id)
}

/**
 * Records a type and name on one of the signed-in user's templates.
 *
 * @param {string} ownerId - the signed-in user's id
 * @param {string} id - the template's id
 * @param {{ setId: string, name: string }} details - the type and name to record
 * @returns {Promise<object|undefined>} the template as stored
 */
export const updateDetailsFor = async (ownerId, id, details) => {
  requireOwner(ownerId, 'change a template')
  return isStubMode()
    ? stub.updateDetails(ownerId, id, details)
    : client.updateTemplateDetails(ownerId, id, details)
}

/**
 * Replaces the answers one of the signed-in user's templates holds.
 *
 * @param {string} ownerId - the signed-in user's id
 * @param {string} id - the template's id
 * @param {object[]} fulfilments - the encoded answers to hold
 * @returns {Promise<object|undefined>} the template as stored
 */
export const replaceFulfilmentsFor = async (ownerId, id, fulfilments) => {
  requireOwner(ownerId, 'save a template')
  return isStubMode()
    ? stub.replaceFulfilments(ownerId, id, fulfilments)
    : client.replaceTemplateFulfilments(ownerId, id, fulfilments)
}

/**
 * Saves one of the signed-in user's templates, so Manage templates lists it.
 *
 * @param {string} ownerId - the signed-in user's id
 * @param {string} id - the template's id
 * @returns {Promise<object|undefined>} the template as stored
 */
export const saveFor = async (ownerId, id) => {
  requireOwner(ownerId, 'save a template for reuse')
  return isStubMode()
    ? stub.save(ownerId, id)
    : client.saveTemplate(ownerId, id)
}
