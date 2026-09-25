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
import { scopedFields } from './identifier/fields.js'

export { IDENTIFIER_LABELS } from './identifier/table.js'
export { scopedFields }

export const meta = { ...page, collects: [] }
const view = `${TEMPLATES}/features/commodities/animal-identification/animal-identification`

const copy = copyFor({ en, cy }).identification

// Design release 1 asks for identification only where the commodity has an
// identifier type of its own. A line whose commodity declares none has nothing
// to ask, so it gets no panel — and a notification where no line declares one
// has no page at all: the request carries on to the next step of the journey.
const identifiedLines = (answers, evaluation) =>
  state
    .collectionView(answers, ['commodityLines'], evaluation)
    .filter(({ entry }) => scopedFields(entry.commoditySelection).length > 0)

const render = (
  request,
  h,
  journey,
  answers,
  evaluation,
  { forms = new Map(), errors = {}, cardErrors = [] } = {}
) => {
  const lines = identifiedLines(answers, evaluation)
  // The recap is the whole consignment, not just the lines with a panel: a
  // line the page asks nothing of still exists, and hiding it invites the
  // trader to add the commodity a second time.
  const allLines = state.collectionView(answers, ['commodityLines'], evaluation)
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
    selectedCommodities: buildSelectedCommodities(allLines),
    addHref: kit.withChangeContext(
      request,
      pagePath(request.params.journeyId, 'commodities')
    ),
    errors,
    errorSummary: summaryOf(errors, cardErrors)
  })
}

// Nothing on this consignment carries an identifier, so the page does not
// exist for this person: send them on rather than showing an empty one. The
// guard sits on both handlers, so a stale form posting to it moves on too.
const noIdentifiersTarget = async (request, answers, evaluation, scope) =>
  identifiedLines(answers, evaluation).length === 0
    ? kit.nextTarget(request, page, scope)
    : null

const get = async (request, h) => {
  const { journey, answers, evaluation, scope } = await state.get(request, h)
  const onwards = await noIdentifiersTarget(request, answers, evaluation, scope)
  if (onwards) {
    return h.redirect(onwards)
  }
  return render(request, h, journey, answers, evaluation)
}

const post = async (request, h) => {
  const { journey, answers, evaluation, scope } = await state.get(request, h)
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
  const lines = identifiedLines(answers, evaluation)

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
  const { scope: savedScope } = await state.get(request, h)
  return h.redirect(await kit.nextTarget(request, page, savedScope))
}

export const routes = kit.pageRoutes(page, { get, post })
