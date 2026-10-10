import { backendBaseUrl } from '../persistence/records/real/config.js'
import { headers } from '../persistence/records/real/http/headers.js'
import { failed } from '../persistence/records/real/http/failed.js'
import { backendFetch } from '../../../common/helpers/call-counts/backend-fetch.js'

// The owner header is the authorisation: the backend trusts it, so it must
// always come from the verified session, never a payload or a stored field.
const OWNER_HEADER = 'User-Id'

const toTemplate = ({ id, name, setId, created }) => ({
  id,
  name,
  setId,
  created
})

/**
 * Every template the owner has saved, newest saved first.
 *
 * @param {string} ownerId - the signed-in user's id
 * @returns {Promise<Array<{ id: string, name: string, setId: string, created: string }>>} the owner's templates
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
