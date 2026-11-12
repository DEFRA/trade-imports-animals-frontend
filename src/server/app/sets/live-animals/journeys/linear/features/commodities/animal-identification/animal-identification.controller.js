import { pagePath } from '../../../../../../../shared/paths.js'
import { TEMPLATES } from '../../../config.js'
import * as state from '../../../../../../../engine/index.js'
import * as kit from '../../../../../../../shared/kit.js'
import {
  animalIdentificationPage as page,
  consignmentDetailsPage
} from '../page.js'
import { commodityQuestionHref } from '../commodity-question-detour.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../../lib/http-status.js'
import { summaryOf } from './card/error-summary.js'
import { buildSections } from './card/view-model.js'
import { commodityCodesOf, linesOf } from '../lines.js'
import { buildChangeableCommoditiesTable } from '../view-model/selected-commodity-rows.js'
import { capAllowsEntry, identifierCapOf } from './line-cap.js'
import {
  buildLineForms,
  capReachedResponse,
  parseAddAction,
  staysOnIdentification,
  withEmptyFormGuard
} from './form/forms.js'
import { appendLineRecords } from './records/append.js'
import { isRemoveAction, postRemove } from './remove/post-remove.js'
import { buildSelectedCommodities } from './summary/selected-commodities.js'
import { scopedFields } from './identifier/fields.js'
import { needsIdentifying } from '../../../../../services/commodities/index.js'

export { scopedFields }

export const meta = { ...page, collects: [] }
const view = `${TEMPLATES}/features/commodities/animal-identification/animal-identification`

const localisedCopy = copyFor({ en, cy })
const copy = localisedCopy.identification
const selectedCommoditiesCopy = localisedCopy.selectedCommodities

const identifiedLines = (answers, evaluation) =>
  linesOf(answers, evaluation).filter(({ entry }) => needsIdentifying(entry))

const cardLines = (answers, evaluation) =>
  identifiedLines(answers, evaluation).filter(({ index }) =>
    capAllowsEntry(identifierCapOf(answers, index))
  )

const render = (
  request,
  h,
  current,
  { forms = new Map(), errors = {}, cardErrors = [] } = {}
) => {
  const { journey, answers, evaluation } = current
  const changeCountHref = kit.pushTrail(
    request,
    pagePath(request.params.journeyId, consignmentDetailsPage.slug),
    page.slug
  )
  const selectedCommodities = buildSelectedCommodities(
    linesOf(answers, evaluation)
  )
  const addHref = commodityQuestionHref(request, page)
  return h.view(view, {
    ...kit.base(copy.title, {
      backLink: kit.trailBackLink(request),
      journey,
      page,
      surface: 'display'
    }),
    copy,
    selectedCommoditiesCopy,
    sections: buildSections(
      answers,
      cardLines(answers, evaluation),
      forms,
      errors,
      changeCountHref
    ),
    selectedCommodities,
    selectedTable: buildChangeableCommoditiesTable(
      selectedCommodities,
      selectedCommoditiesCopy,
      copy.summary,
      addHref
    ),
    addHref,
    errors,
    errorSummary: summaryOf(errors, cardErrors)
  })
}

const renderRefused = (request, h, current, options) =>
  render(request, h, current, options).code(HTTP_STATUS_BAD_REQUEST)

const logCapRefusalsAndRender = (request, h, current, options) => {
  for (const { index, cap } of options.cardErrors) {
    kit.logRefusal(request, {
      reason: 'animal-identifier-cap-reached',
      lineIndex: index,
      cap,
      level: 'warn'
    })
  }
  return renderRefused(request, h, current, options)
}

const noIdentifiersTarget = async (request, answers, evaluation, scope) => {
  if (identifiedLines(answers, evaluation).length > 0) {
    return null
  }
  request.logger.info(
    {
      journeyId: request.params.journeyId,
      commodityCodes: commodityCodesOf(linesOf(answers, evaluation))
    },
    'Animal identification skipped: nothing on the consignment carries an identifier'
  )
  return kit.nextTargetKeepingTrail(request, page, scope)
}

const get = async (request, h) => {
  const current = await state.get(request, h)
  const { answers, evaluation, scope } = current
  const onwards = await noIdentifiersTarget(request, answers, evaluation, scope)
  if (onwards) {
    return h.redirect(onwards)
  }
  return render(request, h, current)
}

const post = async (request, h) => {
  const current = await state.get(request, h)
  const { answers, evaluation, scope } = current
  const onwards = await noIdentifiersTarget(request, answers, evaluation, scope)
  if (onwards) {
    return h.redirect(onwards)
  }
  const payload = request.payload ?? {}
  const action = (payload.action ?? '').toString()
  if (isRemoveAction(action)) {
    return postRemove(request, h, action)
  }
  const addIndex = parseAddAction(action)
  const {
    forms,
    capByLineAtCap,
    errors: formErrors
  } = buildLineForms(payload, answers, cardLines(answers, evaluation), action)

  const capReached = capReachedResponse({
    render: logCapRefusalsAndRender,
    request,
    h,
    current,
    forms,
    addIndex,
    capByLineAtCap
  })
  if (capReached) {
    return capReached
  }

  const errors = withEmptyFormGuard(formErrors, forms, addIndex)

  if (Object.keys(errors).length > 0) {
    return renderRefused(request, h, current, { forms, errors })
  }

  const cardErrors = await appendLineRecords(request, h, forms)

  if (cardErrors.length > 0) {
    return logCapRefusalsAndRender(request, h, await state.get(request, h), {
      cardErrors
    })
  }

  if (staysOnIdentification(action, forms, answers)) {
    return h.redirect(
      kit.carryTrail(request, pagePath(request.params.journeyId, page.slug))
    )
  }
  const { scope: savedScope } = await state.get(request, h)
  return h.redirect(kit.nextTarget(request, page, savedScope))
}

export const routes = kit.pageRoutes(page, { get, post })
