/**
 * Pure function: turn a Page (from flow.js) + the current state into an
 * array of FieldDescriptors the template renders. This is the
 * logical-model → controller-input seam.
 *
 * A FieldDescriptor is:
 *   { obligation, path, mandatoryToSaveAndContinue, errors, widget, view }
 * where `view` is the `FieldViewItem` shape consumed by partials/fields.njk.
 *
 * The build respects obligation scope: only entries whose obligation
 * is inScope (and, for per-record entries, whose path exists in the
 * group's record set) end up in the output.
 */

import { domain } from '../domain/index.js'
import { expandPresents, optionsFor } from '../engine/index.js'
import { pickWidget } from './field-widgets.js'
import { forObligation } from './presentation.js'

function entryInScope(entry, state) {
  const impl = state.obligations?.[entry.obligation.id]
  if (!impl || !impl.inScope) return false
  if (entry.path === null) return true
  const records = impl.records ?? []
  return records.some((r) => r.fulfilmentId === entry.path)
}

function fieldId(entry) {
  return entry.path
    ? `${entry.obligation.name}-${entry.path}`
    : entry.obligation.name
}

function readValue(entry, state) {
  const stored = state.fulfilments?.[entry.obligation.id]
  if (stored === undefined || stored === null) return undefined
  if (entry.path === null) return stored
  if (typeof stored === 'object' && !Array.isArray(stored)) {
    return stored[entry.path]
  }
  return undefined
}

/**
 * buildFieldDescriptors(page, state, fieldErrors?)
 *   → [{ obligation, path, mandatoryToSaveAndContinue, errors, widget, view }]
 *
 * `fieldErrors` (optional) is the `{ [id]: { text } }` map from
 * formatDomainErrors — one entry is injected into each rule's build ctx.
 */
export function buildFieldDescriptors(page, state, fieldErrors = {}) {
  const entries = expandPresents(page, state)
  const out = []
  for (const entry of entries) {
    if (!entryInScope(entry, state)) continue
    const id = fieldId(entry)
    const domainEntry = domain.get(entry.obligation.id)
    const presentation = forObligation(entry.obligation)
    const options =
      domainEntry?.type === 'enum'
        ? optionsFor(entry.obligation, state.fulfilments, undefined, domain, {
            path: entry.path
          })
        : []
    const value = readValue(entry, state)
    const error = fieldErrors[id]?.text
    const chosen = pickWidget({
      obligation: entry.obligation,
      entry: domainEntry,
      options,
      id,
      value,
      legend: presentation.legend,
      hint: presentation.hint,
      labels: domainEntry?.labels,
      error,
      // Whole fieldErrors map for widgets (e.g. address block) that
      // need to look up per-sub-field errors keyed by `${id}__${sub}`.
      fieldErrors
    })
    if (!chosen) continue
    out.push({
      obligation: entry.obligation,
      path: entry.path,
      mandatoryToSaveAndContinue: entry.mandatoryToSaveAndContinue,
      errors: entry.errors,
      widget: chosen.rule,
      subFields: domainEntry?.subFields ?? null,
      view: chosen.view
    })
  }
  return out
}
