import {
  addFulfilment,
  evaluate,
  markCollectionReviewed,
  nextAfter,
  removeFulfilment
} from '../../contract/index.js'
import {
  breadcrumbs,
  currentJourney,
  hubPath,
  LAYOUT,
  pagePath,
  TEMPLATES
} from '../../journey/index.js'
import { CLAIM_NAMES, flow, page, typeEntry } from './page-model.js'
import { addFields, claimRows } from './view-models.js'

/**
 * Route handlers for the claims loop: manage list (GET/POST), add
 * sub-page (GET/POST) and remove-by-index — thin Hapi plumbing over the
 * contract barrel and the claims view-models.
 */

const ACTION_ADD = 'add'

export const getClaimsList = (request, h) => {
  const journey = currentJourney(request, h)
  return h.view(`${TEMPLATES}/claims-list`, {
    layout: LAYOUT,
    pageTitle: page.title,
    heading: page.heading,
    rows: claimRows(evaluate(journey)),
    listCopy: page.listCopy,
    backLink: hubPath(),
    breadcrumbs: breadcrumbs(page.title)
  })
}

export const postClaimsList = (request, h) => {
  const journey = currentJourney(request, h)
  if (request.payload?.action === ACTION_ADD) {
    return h.redirect(pagePath(page.addPage.slug))
  }
  // Continue marks the collection REVIEWED (spike-a's markClaimsDone,
  // parity ruling c): an empty list then counts complete on the hub
  // while the atLeastOne mandate still blocks the CYA POST.
  const { evaluation } = markCollectionReviewed(journey, CLAIM_NAMES)
  return h.redirect(nextAfter(page.id, evaluation))
}

export const getClaimsAddForm = (request, h) => {
  currentJourney(request, h)
  return h.view(`${TEMPLATES}/claims-add`, {
    layout: LAYOUT,
    pageTitle: page.addPage.heading,
    heading: page.addPage.heading,
    buttonText: page.addPage.buttonText,
    errorSummaryTitle: flow.defaults.errorSummaryTitle,
    fields: addFields(),
    backLink: pagePath(page.slug),
    breadcrumbs: breadcrumbs(page.addPage.heading)
  })
}

export const postClaimsAddForm = (request, h) => {
  const journey = currentJourney(request, h)
  addFulfilment(journey, CLAIM_NAMES, request.payload ?? {})
  return h.redirect(pagePath(page.slug))
}

export const getRemoveClaim = (request, h) => {
  const journey = currentJourney(request, h)
  const evaluation = evaluate(journey)
  const claims = evaluation.obligations[typeEntry.obligation].fulfilments
  const claim = claims[Number(request.params.index)]
  if (claim) {
    removeFulfilment(journey, CLAIM_NAMES, claim.fulfilmentId)
  }
  return h.redirect(pagePath(page.slug))
}
