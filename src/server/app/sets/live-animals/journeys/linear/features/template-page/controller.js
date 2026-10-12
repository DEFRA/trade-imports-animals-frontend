import {
  templatePagePath,
  templatesPath
} from '../../../../../../shared/paths.js'
import { templateOwnerId } from '../../../../../../shared/template-mode.js'
import { TEMPLATES } from '../../config.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as state from '../../../../../../engine/index.js'
import * as templates from '../../../../../../services/templates/index.js'
import { formatMomentAsLongDay } from '../../../../../../lib/validate/calendar.js'
import { partiesFromStoredAnswers } from '../addresses/frozen-parties.js'
import { buildSections } from '../check-answers/view-model/index.js'
import { copy as reviewEn } from '../check-answers/copy/copy.en.js'
import { copy as reviewCy } from '../check-answers/copy/copy.cy.js'
import { templateTitle } from '../templates/template-title.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { takeUpdatedTemplate } from './updated-banner.js'

const view = `${TEMPLATES}/features/template-page/template`

const copy = copyFor({ en, cy })
const reviewCopy = copyFor({ en: reviewEn, cy: reviewCy })

// A template with no name is confirmed without one.
const updatedHeading = (name) =>
  name ? copy.updated.heading(name) : copy.updated.unnamedHeading

const USE_SLUG = 'use'
const DELETE_SLUG = 'delete'

// The design shows the place of origin as a template's contact address
// when none was chosen; the template itself keeps what was answered.
const withContactOrPlaceOfOrigin = (parties) => ({
  ...parties,
  contactAddress: parties.contactAddress ?? parties.placeOfOrigin
})

// The page shows the review's own cards, without documents and renumbered, so
// a change to a review card reaches a saved template with no work here. Nothing
// on a template is owed, so no card is named as unfinished.
const renderTemplatePage = async (request, h, template) => {
  const { journey, answers, scope, evaluation } = await state.get(request, h)
  const parties = withContactOrPlaceOfOrigin(
    await partiesFromStoredAnswers(answers)
  )
  const sections = await buildSections(
    answers,
    scope,
    evaluation,
    journey.journeyId,
    false,
    parties
  )
  const title = templateTitle(template.name)
  const justUpdated = takeUpdatedTemplate(request)

  return h.view(view, {
    ...kit.base(title, { backLink: templatesPath() }),
    heading: title,
    dateCreated: copy.dateCreated(
      formatMomentAsLongDay(new Date(template.saved ?? template.created))
    ),
    useAction: templatePagePath(template.id, USE_SLUG),
    deleteHref: templatePagePath(template.id, DELETE_SLUG),
    updatedBanner: justUpdated
      ? { heading: updatedHeading(justUpdated.name) }
      : null,
    copy,
    reviewCopy,
    sections
  })
}

/**
 * Wraps the template overview's handler so a saved template opens its own
 * page. A template still being created keeps the task list; a template the
 * user does not have opens Manage templates.
 *
 * @param {Function} taskList - the overview handler, the template's task list
 * @returns {Function} the Hapi handler for the template's address
 */
export const withTemplatePage = (taskList) => async (request, h) => {
  const template = await templates.getFor(
    templateOwnerId(),
    request.params.journeyId
  )
  if (!template) {
    return h.redirect(templatesPath())
  }
  if (templates.isBeingCreated(template)) {
    return taskList(request, h)
  }
  return renderTemplatePage(request, h, template)
}
