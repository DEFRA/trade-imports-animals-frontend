/**
 * Coverage test — closes gap 2 from `docs/testing.md` (mutation 5).
 *
 * Every obligation in the manifest must be either:
 *   a. wired to a `domain/index.js` entry (has legal-value semantics), OR
 *   b. explicitly present on the KNOWN_UNWIRED allow-list below (with a
 *      reason so future maintainers know why it's exempt).
 *
 * A new obligation added to the manifest without either fails this
 * test — that's the point. It stops mutation 5 (add-and-forget)
 * slipping through.
 *
 * As the V4 buildout (step 5 in NEXT.md) wires each block properly,
 * remove entries from KNOWN_UNWIRED. Ideally the list is empty when
 * step 5 completes.
 */

import { describe, it, expect } from 'vitest'
import { obligations } from './obligations.js'
import { domain } from '../domain/index.js'

/**
 * Obligations known to be unwired at this point in the spike.
 * Grouped by reason so removing entries as V4 buildout wires them
 * is a mechanical process.
 */
const KNOWN_UNWIRED = new Set([
  // Group containers — no direct value at this level; children carry
  // the semantics. commodityLine + unitRecord are structural.
  'commodityLine',
  'unitRecord',

  // Standard address blocks — composite `{ name, addressLine1, ...,
  // country, telephone, email }` value; field-level validation is out
  // of scope of the obligation model (per obligations.js comment).
  // Will get a composite widget + validators during step 5.
  'placeOfOrigin',
  'consignor',
  'consignee',
  'importer',
  'placeOfDestination',
  'contactAddress',
  'commercialTransporter',
  'privateTransporter',
  'permanentAddress',

  // Yes/No enums from MDM — need domain entries during step 5.
  'regionCodeRequirement',
  'containsUnweanedAnimals',

  // MDM-sourced enums — need domain entries during step 5 once the
  // MDM list is available.
  'portOfEntry',
  'commodityType',
  'species',

  // Free-text or integer with max-length per V4 — need domain entries
  // during step 5.
  'regionCode',
  'numberOfAnimals',
  'passport',
  'tattoo',
  'earTag',
  'horseName',
  'identificationDetails',
  'description',

  // Accompanying-document all-or-nothing block — four fields sharing
  // an applyTo. Step 5 wires domain entries per field.
  'accompanyingDocumentType',
  'accompanyingDocumentAttachmentType',
  'accompanyingDocumentReference',
  'accompanyingDocumentDateOfIssue'
])

describe('coverage — every obligation is wired to domain or explicitly allow-listed', () => {
  it('has no obligation that lacks both a domain entry and an allow-list entry', () => {
    const missing = obligations
      .filter((o) => !domain.has(o.id) && !KNOWN_UNWIRED.has(o.name))
      .map((o) => o.name)
    expect(missing).toEqual([])
  })

  it('KNOWN_UNWIRED does not contain obligations that were later wired', () => {
    // Prevents drift the other way: if we wire an obligation to domain
    // we must remove it from the allow-list, or the allow-list slowly
    // rots and stops being useful.
    const overWired = [...KNOWN_UNWIRED].filter((name) => {
      const obligation = obligations.find((o) => o.name === name)
      return obligation && domain.has(obligation.id)
    })
    expect(overWired).toEqual([])
  })

  it('KNOWN_UNWIRED entries all correspond to real obligations', () => {
    // Rename in obligations.js must reach the allow-list too.
    const orphans = [...KNOWN_UNWIRED].filter(
      (name) => !obligations.some((o) => o.name === name)
    )
    expect(orphans).toEqual([])
  })
})

describe('uniqueness — every obligation has a distinct id and name', () => {
  it('has no duplicate ids in the manifest', () => {
    // Duplicate ids collide in every id-keyed structure the evaluator
    // builds (obligationsById, obligationChildren, etc.); one wins and
    // the loser is silently invisible. A rename or copy-paste that
    // reuses the same id must fail immediately.
    const counts = new Map()
    for (const o of obligations) {
      counts.set(o.id, (counts.get(o.id) ?? 0) + 1)
    }
    const duplicates = [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([id, count]) => `${id} (×${count})`)
    expect(duplicates).toEqual([])
  })

  it('has no duplicate names in the manifest', () => {
    // Duplicate names silently corrupt every name-keyed downstream: the
    // dictionary shows the obligation twice; `presentation.js`'s
    // name-based lookup returns whichever entry matches first;
    // KNOWN_UNWIRED status becomes ambiguous. Mutation 11 in
    // docs/testing.md is exactly this.
    const counts = new Map()
    for (const o of obligations) {
      counts.set(o.name, (counts.get(o.name) ?? 0) + 1)
    }
    const duplicates = [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([name, count]) => `${name} (×${count})`)
    expect(duplicates).toEqual([])
  })
})
