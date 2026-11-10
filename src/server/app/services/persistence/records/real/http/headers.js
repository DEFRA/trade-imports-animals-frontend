import { currentOrganisationId } from '../../../../../../common/helpers/organisation-id.js'
import { traceHeaders } from '../../../../http/trace-headers.js'

export const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

export const headers = () => {
  const organisationId = currentOrganisationId()
  if (!organisationId) {
    throw new Error(
      'Cannot reach the notifications backend without an organisation from the signed-in session'
    )
  }
  return {
    ...traceHeaders('application/json'),
    [ORGANISATION_ID_HEADER]: organisationId
  }
}
