/**
 * accompanying-doc-page-controller — accompanying-document-scoped
 * generic form-page handler.
 *
 * Mirrors `line-page-controller.js` but scoped to a single accompanying
 * document via `request.params.docId`. Registered against URLs of the
 * form `/accompanying-documents/{docId}/{pageName}`. Renders ONE input
 * per page (the doc's field), validates only that doc's payload, and —
 * on save — walks to the next unfulfilled per-doc page or returns to
 * `/accompanying-documents`.
 *
 * Kept as a sibling to `line-page-controller.js` rather than being
 * generalised — a third top-level user-driven records group would make
 * the extraction pay off; WS4 has two so the small duplication is fine.
 */

import { fieldsForPage, validatePagePayload, findPage } from '../contract.js'
import { firstUnfulfilledPageForLine } from '../engine/index.js'
import { subsectionOfPage } from '../flow/flow.js'
import { readState, writeAnswer } from './state.js'
import { pageCopy, forObligation } from './presentation.js'
import { chrome } from './chrome.js'
import { t } from './i18n.js'
import { accompanyingDocument } from '../obligations/obligations.js'

const BASE = '/prototype/eudpa-249'

function pageTitle(page) {
  if (page.presentsForEach) {
    return forObligation(page.presentsForEach.obligation).pageTitle
  }
  if (page.presents?.length === 1) {
    return forObligation(page.presents[0].obligation).pageTitle
  }
  return pageCopy(page.page).pageTitle
}

function backLinkFor() {
  return `${BASE}/accompanying-documents`
}

function docExists(state, docId) {
  const records = state.obligations?.[accompanyingDocument.id]?.records ?? []
  return records.some((r) => r.fulfilmentId === docId)
}

/** After saving on `page` for a specific doc, walk the subsection for
 *  the next unfulfilled per-doc mandatory page. `firstUnfulfilledPageForLine`
 *  is generic over single-segment ids — reuse it verbatim, just against
 *  the accompanying-documents subsection scope. Return the summary
 *  index when the doc's mandatories are done. */
function nextAfterForDoc(page, state, docId) {
  const subsection = subsectionOfPage(page.page)
  if (subsection) {
    const inSub = firstUnfulfilledPageForLine(subsection, state, docId)
    if (inSub && inSub.page !== page.page) {
      return { kind: 'doc-page', page: inSub, docId }
    }
  }
  return { kind: 'accompanying-documents-list' }
}

function urlForNext(target) {
  if (target.kind === 'accompanying-documents-list') {
    return `${BASE}/accompanying-documents`
  }
  return `${BASE}/accompanying-documents/${target.docId}/${target.page.page}`
}

export function makeAccompanyingDocPageController(page) {
  return {
    get: {
      handler(request, h) {
        const { docId } = request.params
        const state = readState(request)
        if (!docExists(state, docId)) {
          return h.redirect(`${BASE}/accompanying-documents`)
        }
        // `lineId` is the single-segment key name used by fieldsForPage
        // for any single-segment records group — reused verbatim for
        // accompanying-documents.
        const descriptors = fieldsForPage(page, state, {}, { lineId: docId })
        return h.view('shared/page', {
          chrome: chrome(),
          layout: 'layout.njk',
          pageTitle: pageTitle(page),
          heading: pageTitle(page),
          buttonText: t('chrome.saveAndContinue'),
          fields: descriptors.map((d) => d.view),
          backLink: backLinkFor(),
          crumb: request.plugins?.crumb ?? null
        })
      }
    },
    post: {
      handler(request, h) {
        const { docId } = request.params
        const state = readState(request)
        if (!docExists(state, docId)) {
          return h.redirect(`${BASE}/accompanying-documents`)
        }
        const result = validatePagePayload(page, request.payload, state, {
          lineId: docId
        })
        if (!result.ok) {
          const descriptors = fieldsForPage(page, state, result.fieldErrors, {
            lineId: docId,
            submittedValues: result.values
          })
          return h
            .view('shared/page', {
              chrome: chrome(),
              layout: 'layout.njk',
              pageTitle: pageTitle(page),
              heading: pageTitle(page),
              buttonText: t('chrome.saveAndContinue'),
              fields: descriptors.map((d) => d.view),
              backLink: backLinkFor(),
              errorSummary: result.errorList,
              crumb: request.plugins?.crumb ?? null
            })
            .code(400)
        }
        writeAnswer(request, result.values)
        const stateAfter = readState(request)
        const target = nextAfterForDoc(page, stateAfter, docId)
        return h.redirect(urlForNext(target))
      }
    }
  }
}

/** Find the flow page whose name matches — used by the router to build
 *  accompanying-document-scoped routes. */
export function findAccompanyingDocPage(pageName) {
  const page = findPage(pageName)
  if (!page?.presentsForEach) return null
  return page
}
