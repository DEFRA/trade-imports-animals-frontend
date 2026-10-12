import { DRAFT } from '../../../engine/persistence/records.js'
import { templateOwnerId } from '../../../shared/template-mode.js'
import * as templates from '../../templates/index.js'
import {
  decodePersistedFulfilment,
  encodeEvaluatorFulfilments
} from '../records/fulfilment-codec/index.js'

const withoutNotHeld = (fulfilment, notHeld) =>
  Object.fromEntries(
    Object.entries(fulfilment ?? {}).filter(([id]) => !notHeld.includes(id))
  )

const notOffered = (operation) => async () => {
  throw new Error(`${operation} is not offered in template mode`)
}

/**
 * Builds the records port a journey page reads through in template mode.
 *
 * @param {{ notHeld?: string[] }} [options] - `notHeld`: obligation ids a
 * template never holds. They are dropped when the answers are written and when
 * they are loaded, so a template that once held one shows none.
 * @returns {object} the records port.
 */
export const createTemplateRecords = ({ notHeld = [] } = {}) => {
  const marshal = ({ id, name, setId, created, version, fulfilments }) => ({
    journeyId: id,
    status: DRAFT,
    createdAt: created ?? null,
    submittedAt: null,
    concurrencyToken: version ?? null,
    fulfilment: withoutNotHeld(decodePersistedFulfilment(fulfilments), notHeld),
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
        encodeEvaluatorFulfilments(
          withoutNotHeld(structuredClone(fulfilment ?? {}), notHeld)
        )
      )
    )

  return {
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
}
