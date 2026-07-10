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

  // Standard address blocks wired during step 4 iteration 7:
  // - Phase A: commercialTransporter (first worked example).
  // - Phase B: privateTransporter, placeOfOrigin, consignor, consignee,
  //   importer, placeOfDestination, contactAddress.
  // permanentAddress stays parked — it's `within: unitRecord` and needs
  // depth-2 per-unit infrastructure not yet built.
  'permanentAddress',

  // Yes/No enums from MDM — need domain entries during step 5.
  // containsUnweanedAnimals wired during step 4 iteration 1.
  // regionCodeRequirement wired during step 4 iteration 2.

  // MDM-sourced enums — need domain entries during step 5 once the
  // MDM list is available.
  // portOfEntry wired during step 4 iteration 3.
  // species wired during step 4 iteration 4.
  // commodityType wired during step 4 iteration 6 (line-scoped enum).

  // Free-text or integer with max-length per V4 — need domain entries
  // during step 5.
  // regionCode wired during step 4 iteration 2.
  // numberOfAnimals wired during step 4 iteration 5 (integer + per-
  // species cap predicate — see docs/add-an-obligation.md).
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

describe('structural integrity — no cycles in `within` references', () => {
  it('every obligation has a within-chain that terminates in null', () => {
    // Without this, a self-loop or a cycle in the manifest hangs the
    // whole evaluator: buildAncestorGroups walks `while (cur) cur =
    // cur.within` and never terminates. The test guards against
    // regressions by walking each chain with a max-depth bound and a
    // seen-set. Any cycle fails deterministically before the evaluator
    // is ever built.
    const problems = []
    for (const o of obligations) {
      const seen = new Set()
      let cur = o.within
      let depth = 0
      while (cur) {
        if (seen.has(cur.id)) {
          problems.push(`${o.name} → cycle at ${cur.name}`)
          break
        }
        seen.add(cur.id)
        cur = cur.within
        depth += 1
        if (depth > 100) {
          problems.push(`${o.name} → chain deeper than 100 (likely cycle)`)
          break
        }
      }
    }
    expect(problems).toEqual([])
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
