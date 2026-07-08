/**
 * Controller sketch — how a page's JOI schema composes from the domain
 * module. Not a working controller: the aim is to show that
 *
 *   (a) each obligation's rendering shape and rules live in one place
 *       (Layer 1.25 / domain), and
 *   (b) the controller doesn't restate them; it derives from them.
 *
 * The sketch here builds a JOI-ish schema by walking the presents of a
 * Page and mapping each domain entry into a JOI equivalent. `joi` is
 * hand-stubbed to avoid pulling the real library into a spike; the
 * shape mirrors what Joi would give.
 */

import { domain } from './domain.js'
import { optionsFor } from './runtime.js'

// ---------------------------------------------------------------------------
// A minimal Joi stand-in — same fluent shape as the real thing, no
// runtime coercion. In production replace with `import Joi from 'joi'`
// and delete this stub.
// ---------------------------------------------------------------------------

const joi = {
  string: () => ({ kind: 'string' }),
  number: () => ({ kind: 'number', __chain: [] }),
  array: () => ({ kind: 'array' }),
  object: (shape) => ({ kind: 'object', shape })
}

// ---------------------------------------------------------------------------
// Domain-entry → Joi mapping. Each shape produces a specific Joi
// expression. Custom predicates go behind `.custom(...)` — Joi calls
// the predicate with the value and expects a validated value or throw.
// ---------------------------------------------------------------------------

function schemaFor(entry, fulfilments, ids) {
  if (entry.type === 'enum') {
    const options = entry.options(fulfilments, ids) ?? []
    // .valid(...options) — restrict to the currently-legal set. When
    // options change (e.g. reason flips), the schema is rebuilt.
    return { ...joi.string(), valid: options }
  }
  if (entry.type === 'integer') {
    return {
      ...joi.number(),
      integer: true,
      custom: (value) => {
        const errs = entry.predicate(value, {
          fulfilments,
          path: null,
          siblingValue: () => undefined
        })
        if (errs.length) throw Object.assign(new Error(errs[0].code), { errs })
        return value
      }
    }
  }
  return joi.string()
}

// ---------------------------------------------------------------------------
// Compose a page schema from its presents + presentsForEach + the
// current fulfilments (needed to resolve dynamic option sets).
// ---------------------------------------------------------------------------

export function pageSchema(page, fulfilments = {}, ids = new Map()) {
  const shape = {}
  for (const entry of page.presents ?? []) {
    const domainEntry = domain.get(entry.obligation.id)
    if (!domainEntry) continue
    shape[entry.obligation.name] = schemaFor(domainEntry, fulfilments, ids)
  }
  // presentsForEach: each in-scope group-instance gets its own key
  // `${obligationName}[${fulfilmentId}]`. In production a JOI array or
  // pattern-keyed object would model this — sketch just enumerates.
  if (page.presentsForEach) {
    const domainEntry = domain.get(page.presentsForEach.obligation.id)
    if (domainEntry) {
      shape[`${page.presentsForEach.obligation.name}[]`] = schemaFor(
        domainEntry,
        fulfilments,
        ids
      )
    }
  }
  return joi.object(shape)
}

// ---------------------------------------------------------------------------
// Example — the pattern in one paragraph.
//
// A controller handler for POST /pages/purpose-details:
//
//   const schema = pageSchema(purposeDetailsPage, currentFulfilments)
//   const { value, error } = schema.validate(body)
//   if (error) return renderPage({ errors: error })
//   writeFulfilments({ [purposeInInternalMarket.id]: value.purpose })
//   const state = evaluate(currentFulfilments)
//   return redirectTo(firstUnfulfilledPage(currentSection, state))
//
// The controller never restates "these are the legal options" or "the
// arrival date must be DD/MM/YYYY" — every such rule sits in domain.js.
// The controller composes and applies.
// ---------------------------------------------------------------------------

/**
 * A trace-only helper used by the sketch tests / eyeballing — returns
 * the option lists a controller would surface for each presents entry.
 */
export function optionListsForPage(page, fulfilments, ids = new Map()) {
  const out = {}
  for (const entry of page.presents ?? []) {
    const domainEntry = domain.get(entry.obligation.id)
    if (domainEntry?.type === 'enum') {
      out[entry.obligation.name] = optionsFor(
        entry.obligation,
        fulfilments,
        ids,
        domain
      )
    }
  }
  return out
}
