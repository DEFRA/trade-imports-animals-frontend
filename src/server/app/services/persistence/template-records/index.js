import { DRAFT } from '../../../engine/persistence/records.js'
import { templateOwnerId } from '../../../shared/template-mode.js'
import * as templates from '../../templates/index.js'
import {
  decodePersistedFulfilment,
  encodeEvaluatorFulfilments
} from '../records/fulfilment-codec/index.js'

// The records port a journey page reads through while it is walked in template
// mode. It holds the same encoded fulfilments a notification does, in the
// user's template store, and offers none of the notification lifecycle.
const marshal = ({ id, name, setId, created, version, fulfilments }) => ({
  journeyId: id,
  status: DRAFT,
  createdAt: created ?? null,
  submittedAt: null,
  concurrencyToken: version ?? null,
  fulfilment: decodePersistedFulfilment(fulfilments),
  templateName: name ?? '',
  setId
})

const load = async ({ journeyId }) => {
  const template = await templates.getFor(templateOwnerId(), journeyId)
  return template ? marshal(template) : undefined
}

const replaceFulfilment = async (journeyId, fulfilment) =>
  marshal(
    await templates.replaceFulfilmentsFor(
      templateOwnerId(),
      journeyId,
      encodeEvaluatorFulfilments(structuredClone(fulfilment ?? {}))
    )
  )

const notOffered = (operation) => async () => {
  throw new Error(`${operation} is not offered in template mode`)
}

export const templateRecords = {
  load,
  replaceFulfilment,
  has: async (journeyId) => Boolean(await load({ journeyId })),
  clear: async () => {},
  create: notOffered('create'),
  list: notOffered('list'),
  finalise: notOffered('finalise'),
  amend: notOffered('amend'),
  cancelAmend: notOffered('cancelAmend'),
  copy: notOffered('copy'),
  softDelete: notOffered('softDelete')
}
