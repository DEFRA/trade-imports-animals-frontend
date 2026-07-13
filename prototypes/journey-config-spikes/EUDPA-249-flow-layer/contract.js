/**
 * Contract — the seam between the logical model (obligations + domain +
 * flow + runtime primitives) and the browser layer (controllers +
 * templates). Controllers and templates only call functions on this
 * module.
 *
 * The shape borrows names from the 14-function `contract` interface on
 * the parent branch (`spike/EUDPA-249-prototype-layouts`, shared/*.js)
 * but only the functions actually needed by this spike. Anything the
 * browser layer wants to know about the model should be exposed here.
 */

import { createObligationEvaluator } from './obligations/evaluator.js'
import { obligations as v4Obligations } from './obligations/obligations.js'

import {
  flow,
  walkPages,
  walkSubsections,
  subsectionOfPage,
  sectionOfSubsection
} from './flow/flow.js'
import { domain } from './domain/index.js'
import {
  containerStatus,
  firstApplicablePage,
  firstUnfulfilledPage,
  firstUnfulfilledPageForLine,
  firstUnfulfilledPageForUnit,
  firstPagePresentingObligation,
  groupInvariantErrors,
  journeyState,
  pageStatus,
  validate as validateObligation
} from './engine/index.js'
import { buildFieldDescriptors } from './lib/build-field-descriptors.js'
import { formatDomainErrors } from './lib/format-domain-errors.js'
import { isBlankValue } from './lib/is-blank-value.js'
import { t } from './lib/i18n.js'

const evaluator = createObligationEvaluator({
  obligations: v4Obligations
})

// ---------------------------------------------------------------------------
// State evaluation
// ---------------------------------------------------------------------------

export function evaluateState(fulfilments) {
  return evaluator.evaluate(fulfilments ?? {})
}

// ---------------------------------------------------------------------------
// Structural queries — read directly from the flow.
// ---------------------------------------------------------------------------

export const sections = () => flow.sections

export const subsections = () => walkSubsections()

export const pages = () => walkPages()

export function findPage(pageName) {
  return walkPages().find((p) => p.page === pageName) ?? null
}

export function findSubsection(subsectionId) {
  return walkSubsections().find((s) => s.id === subsectionId) ?? null
}

export function findSection(sectionId) {
  return flow.sections.find((s) => s.id === sectionId) ?? null
}

export const subsectionOf = subsectionOfPage
export const sectionOf = sectionOfSubsection

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export function statusOfPage(page, state) {
  return pageStatus(page, state)
}

export function statusOfContainer(container, state) {
  return containerStatus(container, state)
}

export function statusOfJourney(state, submitted = false) {
  return journeyState(flow, state, submitted)
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

/** Where does a "start" button go? First unfulfilled page in declared
 *  order, falling back to the first applicable page. */
export function startPage(state) {
  for (const section of flow.sections) {
    const unfulfilled = firstUnfulfilledPage(section, state)
    if (unfulfilled) return unfulfilled
  }
  for (const section of flow.sections) {
    const applicable = firstApplicablePage(section)
    if (applicable) return applicable
  }
  return null
}

/** After saving on `page`, where do we send the user? Next unfulfilled
 *  page in the same subsection, or the same section, or the task list. */
export function nextAfter(page, state) {
  const subsection = subsectionOfPage(page.page)
  if (subsection) {
    const inSub = firstUnfulfilledPage(subsection, state)
    if (inSub && inSub.page !== page.page) return { kind: 'page', page: inSub }
  }
  const section = subsection ? sectionOfSubsection(subsection.id) : null
  if (section) {
    const inSec = firstUnfulfilledPage(section, state)
    if (inSec && inSec.page !== page.page) return { kind: 'page', page: inSec }
  }
  return { kind: 'task-list' }
}

/**
 * After saving on `page` for a specific commodity line, where do we
 * send the user? Next unfulfilled per-line page in the same subsection,
 * or (when the line is done) the /lines list. Used by the line-scoped
 * page controller — flow-major navigation but line-scoped.
 */
export function nextAfterForLine(page, state, lineId) {
  const subsection = subsectionOfPage(page.page)
  if (subsection) {
    const inSub = firstUnfulfilledPageForLine(subsection, state, lineId)
    if (inSub && inSub.page !== page.page) {
      return { kind: 'line-page', page: inSub, lineId }
    }
  }
  return { kind: 'lines-list' }
}

/**
 * Unit-scoped analogue of `nextAfterForLine`. After saving on `page`
 * for a specific commodity line and unit, where do we send the user?
 * Next unfulfilled per-unit page in the same subsection, or (when the
 * unit is done) the /lines/{lineId}/units list.
 */
export function nextAfterForUnit(page, state, lineId, unitId) {
  const subsection = subsectionOfPage(page.page)
  if (subsection) {
    const inSub = firstUnfulfilledPageForUnit(subsection, state, lineId, unitId)
    if (inSub && inSub.page !== page.page) {
      return { kind: 'unit-page', page: inSub, lineId, unitId }
    }
  }
  return { kind: 'units-list', lineId }
}

/** Where does the Change link for an obligation go? */
export function changeLinkFor(obligationId) {
  return firstPagePresentingObligation(flow, obligationId)
}

// ---------------------------------------------------------------------------
// Group invariants — cross-obligation rules declared on a group
// obligation via `requires.anyOf`. Used to enforce the V4 "at least
// one Animal Identifier per unit-record" rule.
// ---------------------------------------------------------------------------

/**
 * Returns errors for every in-scope group instance that violates its
 * `requires.anyOf` invariant. Aggregated across every group in the
 * manifest that declares `requires`. Empty when nothing is violated
 * (or when no groups declare `requires` — the empty-manifest case).
 *
 * Shape: `[{ code, groupId, groupName, instanceId }]`. Callers map
 * `instanceId` to a human label (e.g. "Animal 1 on commodity line 2")
 * before rendering.
 */
export function groupInvariantErrorsForState(state) {
  const groupsWithRequires = v4Obligations.filter((o) => o?.requires?.anyOf)
  const out = []
  for (const group of groupsWithRequires) {
    out.push(...groupInvariantErrors(group, state))
  }
  return out
}

// ---------------------------------------------------------------------------
// Field-view building + validation
// ---------------------------------------------------------------------------

export function fieldsForPage(page, state, fieldErrors = {}, options = {}) {
  const all = buildFieldDescriptors(page, state, fieldErrors)
  if (options.lineId == null) return all
  // Line-scoped rendering: filter presentsForEach-expanded descriptors
  // to just the target line so /lines/{id}/... only shows one field.
  return all.filter((d) => d.path === options.lineId)
}

/**
 * Validate a submitted payload against a page's presented obligations.
 * Returns `{ ok, errors, errorList, fieldErrors, values }`.
 *
 * `values` is the coerced-to-obligation-shape map of what the user
 * submitted, ready to be written into fulfilments. Passing
 * `{ lineId }` restricts validation + writes to that one line's
 * fields (used by the line-scoped page controller).
 */
export function validatePagePayload(page, payload, state, options = {}) {
  const descriptors = fieldsForPage(page, state, {}, options)
  const errors = []
  const values = {}
  for (const descriptor of descriptors) {
    const id = descriptor.path
      ? `${descriptor.obligation.name}-${descriptor.path}`
      : descriptor.obligation.name
    let value
    if (descriptor.widget === 'address') {
      // Address-block composite: gather one payload entry per sub-field
      // (`${id}__${sub}`) into a plain object. Predicate checks each
      // required sub-field and emits per-sub-field errors so the error
      // summary + inline errors surface the exact missing input.
      value = {}
      for (const sub of descriptor.subFields ?? []) {
        const raw = payload?.[`${id}__${sub}`]
        value[sub] = typeof raw === 'string' ? raw.trim() : (raw ?? '')
      }
    } else {
      const raw = payload?.[id]
      value = coerceValue(descriptor, raw)
    }
    values[id] = {
      obligation: descriptor.obligation,
      path: descriptor.path,
      value
    }
    // Flow-level submit-mandate: reject blank submissions with the
    // flow-supplied required message before running the domain check.
    // Skip the domain check on blank required — the required error is
    // the one the user needs to see; running an enum/predicate check
    // on undefined would only add noise. See flow.js for property
    // semantics; distinct from obligation.status (completion-mandate).
    if (descriptor.mandatoryToProceed && isBlankValue(value)) {
      const key = descriptor.errors?.required
      errors.push({
        code: 'flow.required',
        obligation: descriptor.obligation.name,
        path: descriptor.path,
        message: key ? t(key) : t('errors.defaultRequired')
      })
      continue
    }
    const perFieldErrors = validateObligation(
      descriptor.obligation,
      value,
      state.fulfilments,
      domain,
      { path: descriptor.path }
    )
    errors.push(...perFieldErrors)
  }
  const { errorList, fieldErrors } = formatDomainErrors(errors)
  return { ok: errors.length === 0, errors, errorList, fieldErrors, values }
}

function coerceValue(descriptor, raw) {
  if (raw === undefined || raw === null) return raw
  if (descriptor.widget === 'number') {
    if (raw === '') return undefined
    const n = Number(raw)
    return Number.isFinite(n) ? n : raw
  }
  if (descriptor.widget === 'checkboxes') {
    if (Array.isArray(raw)) return raw
    if (raw === '') return []
    return [raw]
  }
  if (typeof raw === 'string') return raw
  return raw
}
