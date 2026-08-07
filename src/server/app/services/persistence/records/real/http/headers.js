import { getTraceId } from '@defra/hapi-tracing'
import { tracingHeader } from '../config.js'

const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

export const headers = () => ({
  'Content-Type': 'application/json',
  [tracingHeader]: getTraceId() ?? ''
})

/** Headers for a read the backend resolves against the address book. The
 * organisation must always be the reader's session organisation, forwarded
 * unchanged — the backend passes it straight on to the address book, which
 * treats it as the authenticated organisation. Omitting it is rejected by the
 * backend rather than defaulted, so a missing session cannot silently read
 * against someone else's addresses. */
export const organisationHeaders = (organisationId) => ({
  ...headers(),
  [ORGANISATION_ID_HEADER]: organisationId ?? ''
})

export { ORGANISATION_ID_HEADER }
