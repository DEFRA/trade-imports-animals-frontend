import { currentOrganisationId } from '../../../common/helpers/organisation-id.js'

import { traceHeaders } from './trace-headers.js'

export const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

const notificationsBackendOrgRequired =
  'Cannot reach the notifications backend without an organisation from the signed-in session'

/** Request headers for a trade-imports backend call scoped to one organisation id. */
export const organisationScopedHeaders = (
  organisationId,
  contentType = 'application/json'
) => ({
  ...traceHeaders(contentType),
  [ORGANISATION_ID_HEADER]: organisationId
})

/** Headers for the animals notification backend using the organisation bound on this request. */
export const notificationBackendHeaders = () => {
  const organisationId = currentOrganisationId()
  if (!organisationId) {
    throw new Error(notificationsBackendOrgRequired)
  }
  return organisationScopedHeaders(organisationId)
}
