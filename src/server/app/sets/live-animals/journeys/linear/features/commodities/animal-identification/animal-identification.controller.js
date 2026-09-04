import { hubPath, pagePath } from '../../../../../../../shared/paths.js'
import { TEMPLATES } from '../../../config.js'
import * as state from '../../../../../../../engine/index.js'
import * as kit from '../../../../../../../shared/kit.js'
import {
  animalIdentificationPage as page,
  consignmentDetailsPage
} from '../page.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { summaryOf } from './card/error-summary.js'
import { buildCard } from './card/view-model.js'
import {
  buildLineForms,
  capReachedResponse,
  parseAddAction,
  withEmptyFormGuard
} from './form/forms.js'
import { appendLineRecords } from './records/append.js'
import { isRemoveAction, postRemove } from './remove/post-remove.js'
import { buildSelectedCommodities } from './summary/selected-commodities.js'

export { IDENTIFIER_LABELS } from './identifier/table.js'

export const meta = { ...page, collects: [] }
const view = `${TEMPLATES}/features/commodities/animal-identification/animal-identification`

const copy = copyFor({ en, cy }).identification

const render = (
  request,
  h,
  journey,
  answers,
  evaluation,
  { forms = new Map(), errors = {}, cardErrors = [] } = {}
) => {
  const lines = state.collectionView(answers, ['commodityLines'], evaluation)
  const changeCountHref = kit.withChangeContext(
    request,
    pagePath(request.params.journeyId, consignmentDetailsPage.slug)
  )
  return h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(journey.journeyId),
      journey,
      page
    }),
    copy,
    cards: lines.map((line) =>
      buildCard(answers, line, forms.get(line.index), errors, changeCountHref)
    ),
    selectedCommodities: buildSelectedCommodities(lines),
    hasLines: lines.length > 0,
    addHref: kit.withChangeContext(
      request,
      pagePath(request.params.journeyId, 'commodities')
    ),
    errors,
    errorSummary: summaryOf(errors, cardErrors)
  })
}

const get = async (request, h) => {
  const { journey, answers, evaluation } = await state.get(request, h)
  return render(request, h, journey, answers, evaluation)
}

const post = async (request, h) => {
  const { journey, answers, evaluation } = await state.get(request, h)
  const payload = request.payload ?? {}
  const action = (payload.action ?? '').toString()
  if (isRemoveAction(action)) {
    return postRemove(request, h, action)
  }
  const addIndex = parseAddAction(action)
  const lines = state.collectionView(answers, ['commodityLines'], evaluation)

  const {
    forms,
    atMaxByIndex,
    errors: formErrors
  } = buildLineForms(payload, answers, lines)

  const capReached = capReachedResponse({
    render,
    request,
    h,
    journey,
    answers,
    evaluation,
    forms,
    addIndex,
    atMaxByIndex
  })
  if (capReached) {
    return capReached
  }

  const errors = withEmptyFormGuard(formErrors, forms, addIndex)

  if (Object.keys(errors).length > 0) {
    return render(request, h, journey, answers, evaluation, { forms, errors })
  }

  const cardErrors = await appendLineRecords(request, h, forms)

  if (cardErrors.length > 0) {
    const { answers: current, evaluation: currentEvaluation } = await state.get(
      request,
      h
    )
    return render(request, h, journey, current, currentEvaluation, {
      cardErrors
    })
  }

  if (addIndex !== null) {
    return h.redirect(
      kit.withChangeContext(
        request,
        pagePath(request.params.journeyId, page.slug)
      )
    )
  }
  const { scope } = await state.get(request, h)
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
