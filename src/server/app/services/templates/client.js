import {
  backendBaseUrl,
  HTTP_NOT_FOUND
} from '../persistence/records/real/config.js'
import { headers } from '../persistence/records/real/http/headers.js'
import { failed } from '../persistence/records/real/http/failed.js'
import { backendFetch } from '../../../common/helpers/call-counts/backend-fetch.js'

// The owner header is the authorisation: the backend trusts it, so it must
// always come from the verified session, never a payload or a stored field.
const OWNER_HEADER = 'User-Id'

// The backend refuses any other shape of id with a 400, so an id that cannot be
// a template's is answered here as not found.
const TEMPLATE_ID_PATTERN = /^[0-9a-f]{24}$/

const toTemplate = ({ id, name, setId, created, fulfilments }) => ({
  id,
  name,
  setId,
  created,
  fulfilments: fulfilments ?? []
})

const toTemplateDetail = ({
  id,
  name,
  setId,
  created,
  saved,
  status,
  version,
  fulfilments
}) => ({ id, name, setId, created, saved, status, version, fulfilments })

const requestHeaders = (ownerId) => ({
  ...headers(),
  [OWNER_HEADER]: ownerId
})

const templateUrl = (id) =>
  `${backendBaseUrl}/templates/${encodeURIComponent(id)}`

const send = async (url, method, ownerId, body, action) => {
  const response = await backendFetch(url, {
    method,
    headers: requestHeaders(ownerId),
    ...(body !== undefined && { body: JSON.stringify(body) })
  })
  if (!response.ok) {
    throw await failed(action, response)
  }
  return toTemplateDetail(await response.json())
}

/**
 * Every template the owner has saved, newest saved first.
 *
 * @param {string} ownerId - the signed-in user's id
 * @returns {Promise<Array<{ id: string, name: string, setId: string, created: string, fulfilments: object[] }>>} the owner's templates, each with the encoded answers it holds
 */
export const listTemplates = async (ownerId) => {
  const response = await backendFetch(`${backendBaseUrl}/templates`, {
    method: 'GET',
    headers: { ...headers(), [OWNER_HEADER]: ownerId }
  })

  if (!response.ok) {
    throw await failed('list templates', response)
  }

  const body = await response.json()
  return body.items.map(toTemplate)
}

/**
 * Starts a template for the owner, held as in progress.
 *
 * @param {string} ownerId - the signed-in user's id
 * @param {{ setId: string, name: string, organisationId?: string }} details - the type, name and organisation to record
 * @returns {Promise<object>} the template as stored
 */
export const startTemplate = (ownerId, details) =>
  send(
    `${backendBaseUrl}/templates`,
    'POST',
    ownerId,
    details,
    'start template'
  )

/**
 * One of the owner's templates.
 *
 * @param {string} ownerId - the signed-in user's id
 * @param {string} id - the template's id
 * @returns {Promise<object|undefined>} the template, or undefined when the owner has none by that id
 */
export const getTemplate = async (ownerId, id) => {
  if (!TEMPLATE_ID_PATTERN.test(id)) {
    return undefined
  }
  const response = await backendFetch(templateUrl(id), {
    method: 'GET',
    headers: requestHeaders(ownerId)
  })
  if (response.status === HTTP_NOT_FOUND) {
    return undefined
  }
  if (!response.ok) {
    throw await failed('get template', response)
  }
  return toTemplateDetail(await response.json())
}

/**
 * Records a type and name on one of the owner's templates.
 *
 * @param {string} ownerId - the signed-in user's id
 * @param {string} id - the template's id
 * @param {{ setId: string, name: string }} details - the type and name to record
 * @returns {Promise<object>} the template as stored
 */
export const updateTemplateDetails = (ownerId, id, details) =>
  send(
    `${templateUrl(id)}/details`,
    'PUT',
    ownerId,
    details,
    'update template details'
  )

/**
 * Replaces the answers one of the owner's templates holds.
 *
 * @param {string} ownerId - the signed-in user's id
 * @param {string} id - the template's id
 * @param {object[]} fulfilments - the encoded answers to hold
 * @returns {Promise<object>} the template as stored
 */
export const replaceTemplateFulfilments = (ownerId, id, fulfilments) =>
  send(
    `${templateUrl(id)}/fulfilments`,
    'PUT',
    ownerId,
    { fulfilments },
    'save template answers'
  )

/**
 * Saves one of the owner's templates, so it is listed.
 *
 * @param {string} ownerId - the signed-in user's id
 * @param {string} id - the template's id
 * @returns {Promise<object>} the template as stored
 */
export const saveTemplate = (ownerId, id) =>
  send(`${templateUrl(id)}/save`, 'POST', ownerId, undefined, 'save template')
