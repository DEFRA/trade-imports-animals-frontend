import { hubPath, templatesPath } from '../../../../../../shared/paths.js'
import { currentSetId } from '../../../../../../shared/set-context.js'
import { startJourney } from '../../../../../../engine/journey.js'
import { beginOpeningRun } from '../../../../../../flow/run-state.js'
import { buildActor } from '../../../../../../../common/helpers/actor-helpers.js'
import * as templates from '../../../../../../services/templates/index.js'
import { decodePersistedFulfilment } from '../../../../../../services/persistence/records/fulfilment-codec/index.js'
import { notificationSeedFrom } from './seed-notification.js'

const ownerIdOf = (request) => buildActor(request.auth?.credentials)?.id

// A template that is still being created, or belongs to another set, cannot
// start a notification here.
const usable = (template) =>
  Boolean(template) &&
  !templates.isBeingCreated(template) &&
  template.setId === currentSetId()

/**
 * Starts a new draft notification from one of the signed-in user's saved
 * templates and opens its task list. A template the user cannot use opens
 * Manage templates and starts nothing.
 *
 * @param {object} request - the Hapi request, its `journeyId` param the template's id.
 * @param {object} h - the Hapi response toolkit.
 * @returns {Promise<object>} the redirect to the new notification's task list or to Manage templates.
 */
export const useTemplatePost = async (request, h) => {
  const template = await templates.getFor(
    ownerIdOf(request),
    request.params.journeyId
  )
  if (!usable(template)) {
    return h.redirect(templatesPath())
  }
  const journey = await startJourney(request, h, {
    fulfilment: notificationSeedFrom(
      decodePersistedFulfilment(template.fulfilments ?? [])
    )
  })
  await beginOpeningRun(request, h, journey.journeyId)
  return h.redirect(hubPath(journey.journeyId))
}
