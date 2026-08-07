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
 * treats it as the authenticated organisation.
 *
 * No organisation means no read. Sending the header empty instead would just
 * move the failure: the backend rejects a blank one, and the caller would see
 * an opaque 400 from a request it should never have made. Failing here names
 * the actual cause. */
export const organisationHeaders = (organisationId) => {
  if (!organisationId) {
    throw new Error(
      'Cannot read notifications without an organisation: the signed-in session carries none'
    )
  }
  return {
    ...headers(),
    [ORGANISATION_ID_HEADER]: organisationId
  }
}

export { ORGANISATION_ID_HEADER }
