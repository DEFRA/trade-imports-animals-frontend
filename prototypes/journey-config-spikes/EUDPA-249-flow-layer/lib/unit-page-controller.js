/**
 * unit-page-controller — depth-2 generic form-page handler.
 *
 * Mirrors line-page-controller.js but scoped to a single (line, unit)
 * pair via `request.params.lineId` + `request.params.unitId`.
 * Registered against URLs of the form
 * `/lines/{lineId}/units/{unitId}/{pageName}`. Renders ONE input per
 * page (the composite `${lineId}/${unitId}` record's value), validates
 * only that record's payload, and — on save — walks to the next
 * unfulfilled per-unit page or returns to `/lines/{lineId}/units`.
 *
 * The underlying flow shape is the same `presentsForEach` primitive
 * line pages use; the routing table distinguishes line vs unit pages
 * by `page.presentsForEach.forEachOf` matching `commodityLine` or
 * `unitRecord`.
 */

import {
  fieldsForPage,
  nextAfterForUnit,
  validatePagePayload,
  findPage
} from '../contract.js'
import { readState, writeAnswer } from './state.js'
import { pageCopy, forObligation } from './presentation.js'
import { chrome } from './chrome.js'
import { t } from './i18n.js'
import { commodityLine, unitRecord } from '../obligations/obligations.js'

const BASE = '/prototype/eudpa-249'

function urlForNext(target) {
  if (target.kind === 'units-list') {
    return `${BASE}/lines/${target.lineId}/units`
  }
  return `${BASE}/lines/${target.lineId}/units/${target.unitId}/${target.page.page}`
}

function pageTitle(page) {
  if (page.presentsForEach) {
    return forObligation(page.presentsForEach.obligation).pageTitle
  }
  if (page.presents?.length === 1) {
    return forObligation(page.presents[0].obligation).pageTitle
  }
  return pageCopy(page.page).pageTitle
}

function backLinkFor(lineId) {
  return `${BASE}/lines/${lineId}/units`
}

function lineExists(state, lineId) {
  const records = state.obligations?.[commodityLine.id]?.records ?? []
  return records.some((r) => r.fulfilmentId === lineId)
}

function unitExists(state, lineId, unitId) {
  const compositeKey = `${lineId}/${unitId}`
  const records = state.obligations?.[unitRecord.id]?.records ?? []
  return records.some((r) => r.fulfilmentId === compositeKey)
}

/** True iff the flow page's presented obligation is in scope for the
 *  target (line, unit) composite. permanentAddress is applyTo-scoped
 *  by commodityCode (only for 01061900) — a URL like
 *  /lines/{cattleLine}/units/unit1/permanent-address would otherwise
 *  render an empty form + a POST that silently writes nothing. */
function obligationInScopeForUnit(page, state, lineId, unitId) {
  const obligation = page.presentsForEach?.obligation
  if (!obligation) return true
  const impl = state.obligations?.[obligation.id]
  if (!impl?.inScope) return false
  const compositeKey = `${lineId}/${unitId}`
  const records = impl.records ?? []
  return records.some((r) => r.fulfilmentId === compositeKey)
}

// Line-scoped fieldsForPage takes an { lineId }; the unit variant
// wants the composite path key so descriptors are filtered to just
// this (line, unit) record.
function fieldsForUnit(page, state, fieldErrors, lineId, unitId) {
  const compositeKey = `${lineId}/${unitId}`
  return fieldsForPage(page, state, fieldErrors, { lineId: compositeKey })
}

export function makeUnitPageController(page) {
  return {
    get: {
      handler(request, h) {
        const { lineId, unitId } = request.params
        const state = readState(request)
        if (!lineExists(state, lineId) || !unitExists(state, lineId, unitId)) {
          return h.redirect(`${BASE}/lines`)
        }
        if (!obligationInScopeForUnit(page, state, lineId, unitId)) {
          return h.redirect(`${BASE}/lines/${lineId}/units`)
        }
        const descriptors = fieldsForUnit(page, state, {}, lineId, unitId)
        return h.view('shared/page', {
          chrome: chrome(),
          layout: 'layout.njk',
          pageTitle: pageTitle(page),
          heading: pageTitle(page),
          buttonText: t('chrome.saveAndContinue'),
          fields: descriptors.map((d) => d.view),
          backLink: backLinkFor(lineId),
          crumb: request.plugins?.crumb ?? null
        })
      }
    },
    post: {
      handler(request, h) {
        const { lineId, unitId } = request.params
        const state = readState(request)
        if (!lineExists(state, lineId) || !unitExists(state, lineId, unitId)) {
          return h.redirect(`${BASE}/lines`)
        }
        if (!obligationInScopeForUnit(page, state, lineId, unitId)) {
          return h.redirect(`${BASE}/lines/${lineId}/units`)
        }
        const compositeKey = `${lineId}/${unitId}`
        const result = validatePagePayload(page, request.payload, state, {
          lineId: compositeKey
        })
        if (!result.ok) {
          const descriptors = fieldsForUnit(
            page,
            state,
            result.fieldErrors,
            lineId,
            unitId
          )
          return h
            .view('shared/page', {
              chrome: chrome(),
              layout: 'layout.njk',
              pageTitle: pageTitle(page),
              heading: pageTitle(page),
              buttonText: t('chrome.saveAndContinue'),
              fields: descriptors.map((d) => d.view),
              backLink: backLinkFor(lineId),
              errorSummary: result.errorList,
              crumb: request.plugins?.crumb ?? null
            })
            .code(400)
        }
        writeAnswer(request, result.values)
        const stateAfter = readState(request)
        const target = nextAfterForUnit(page, stateAfter, lineId, unitId)
        return h.redirect(urlForNext(target))
      }
    }
  }
}

/** Find the flow page whose name matches and whose presentsForEach
 *  runs over unitRecord — used by the router to build unit-scoped
 *  routes. */
export function findUnitPage(pageName) {
  const page = findPage(pageName)
  if (!page?.presentsForEach) return null
  if (page.presentsForEach.forEachOf !== unitRecord) return null
  return page
}
