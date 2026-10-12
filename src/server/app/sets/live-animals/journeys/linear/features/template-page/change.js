import { templatePath, templatesPath } from '../../../../../../shared/paths.js'
import {
  templateOwnerId,
  withSavedTemplateChange
} from '../../../../../../shared/template-mode.js'
import { changeContext } from '../../../../../../shared/kit.js'
import { HTTP_STATUS_FOUND } from '../../../../../../lib/http-status.js'
import * as templates from '../../../../../../services/templates/index.js'
import { rememberUpdatedTemplate } from './updated-banner.js'

/**
 * Wraps every template-mode journey page so a Change link on a saved
 * template's page changes one section of it. A template the user does not have
 * opens Manage templates. A saved template reached from a Change link runs the
 * page in the saved-change context, and a save that returns to the template's
 * page is confirmed there once.
 *
 * @param {Function} handler - the journey page's handler
 * @returns {Function} the Hapi handler for the page's template-mode address
 */
export const withTemplateChange = (handler) => async (request, h) => {
  const template = await templates.getFor(
    templateOwnerId(),
    request.params.journeyId
  )
  if (!template) {
    return h.redirect(templatesPath())
  }
  if (!changeContext(request) || templates.isBeingCreated(template)) {
    return handler(request, h)
  }
  const response = await withSavedTemplateChange(() => handler(request, h))
  const returnedToTemplate =
    request.method === 'post' &&
    response?.statusCode === HTTP_STATUS_FOUND &&
    response.headers?.location === templatePath(template.id)
  if (returnedToTemplate) {
    rememberUpdatedTemplate(request, template)
  }
  return response
}
