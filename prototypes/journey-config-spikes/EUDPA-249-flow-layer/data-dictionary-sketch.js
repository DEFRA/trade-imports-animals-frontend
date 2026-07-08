/**
 * Data-dictionary sketch — walks the obligations manifest and the
 * domain module, and emits a JSON view that is:
 *
 *   - name-and-id keyed by obligation,
 *   - scope-shape from the obligation's applyTo.metadata (attached by
 *     the helpers in the obligations manifest),
 *   - value-shape from the domain entry's .metadata,
 *   - reason-codes surfaced (so a stakeholder can spot which failure
 *     codes are declared without reading a closure).
 *
 * This is the "business-facing illustration" arm of the AC — a shape
 * that could be piped into a docs site, a Confluence macro, or a
 * spreadsheet review.
 *
 * The dictionary is **derivable statically** for staticEnum + lookupEnum
 * shapes. computedEnum + predicate entries are marked "dynamic (see
 * readsFrom / reasons)" — they can't be enumerated without running the
 * closure but their reachability is documented via metadata.
 */

import { obligations } from './obligations/obligations.js'
import { domain, certifiedForOptionsLookup } from './domain.js'

const DOMAIN_EXTRA_OBLIGATIONS = [certifiedForOptionsLookup]

// ---------------------------------------------------------------------------
// Obligation scope description — pulls from applyTo.metadata when the
// obligation uses the shared helpers (allowListed, branchedGate, etc.),
// falls back to a generic label.
// ---------------------------------------------------------------------------

function scopeShape(obligation) {
  if (!obligation.applyTo) return { kind: 'always-in-scope' }
  const meta = obligation.applyTo.metadata
  if (!meta) return { kind: 'custom-applyTo' }
  return meta
}

// ---------------------------------------------------------------------------
// Domain-entry description — pulls from entry.metadata attached by the
// factory helpers in domain.js.
// ---------------------------------------------------------------------------

function domainShape(entry) {
  if (!entry) return null
  const meta = entry.metadata ?? { shape: 'unknown' }
  const out = { type: entry.type, ...meta }
  if (out.shape === 'computedEnum' && out.readsFrom) {
    out.staticOptions = null
    out.note =
      'Option set depends on state; readsFrom identifies which siblings ' +
      'the closure inspects.'
  }
  if (out.shape === 'predicate') {
    out.note =
      'Value legality decided at call time by predicate(value, ctx). ' +
      'Emitted failure codes are enumerated under reasons[].'
  }
  return out
}

// ---------------------------------------------------------------------------
// Whole-manifest dictionary
// ---------------------------------------------------------------------------

export function buildDictionary() {
  const seen = new Set(obligations.map((o) => o.id))
  const rows = []

  const push = (obligation) => {
    const entry = domain.get(obligation.id)
    rows.push({
      id: obligation.id,
      name: obligation.name,
      within: obligation.within?.name ?? null,
      scope: scopeShape(obligation),
      domain: domainShape(entry) ?? { note: 'no domain entry' }
    })
  }

  for (const o of obligations) push(o)
  // Include spike-local obligations (e.g. the lookup) so the dictionary
  // is complete against the full three-layer state.
  for (const o of DOMAIN_EXTRA_OBLIGATIONS) {
    if (seen.has(o.id)) continue
    push(o)
  }
  return { obligations: rows }
}

// ---------------------------------------------------------------------------
// Coverage view — which obligations have a domain entry and which
// don't. Highlights the gap so nothing goes to a form without a rule.
// ---------------------------------------------------------------------------

export function coverageReport() {
  const withEntry = []
  const withoutEntry = []
  for (const o of obligations) {
    if (domain.has(o.id)) withEntry.push(o.name)
    else withoutEntry.push(o.name)
  }
  return {
    total: obligations.length,
    withDomainEntry: withEntry.length,
    withoutDomainEntry: withoutEntry.length,
    missing: withoutEntry
  }
}
