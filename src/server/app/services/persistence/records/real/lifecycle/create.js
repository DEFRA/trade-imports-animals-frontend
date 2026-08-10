import { notificationsUrl } from '../config.js'
import { failed } from '../http/failed.js'
import { headers } from '../http/headers.js'
import { marshal } from '../marshal/document.js'

// Under the merged aggregate (EUDPA-323), POST /notifications creates the merged
// notification + fulfilments record in one call: the backend mints the reference
// number and returns the created aggregate including an empty fulfilments payload.
export const create = async () => {
  const response = await fetch(notificationsUrl, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ fulfilments: [] })
  })
  if (!response.ok) {
    throw failed('create notification', response)
  }
  return marshal(await response.json())
}

// Copy: single POST to the merged endpoint. Copy dedup dropped pending EUDPA-314;
// the idempotencyKey parameter is retained on the signature so upstream callers
// (view-model, controller) don't have to change simultaneously, but it is no
// longer forwarded as a header.
export const copy = async (journeyId, _idempotencyKey) => {
  const response = await fetch(`${notificationsUrl}/${journeyId}/copy`, {
    method: 'POST',
    headers: headers()
  })
  if (!response.ok) {
    throw failed('copy notification', response)
  }
  return marshal(await response.json())
}
