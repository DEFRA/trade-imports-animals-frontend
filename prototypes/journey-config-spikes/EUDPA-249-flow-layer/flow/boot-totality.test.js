/**
 * boot-totality.test.js — Phase 4 commit 2 of the EUDPA-288 blend plan.
 *
 * Pins the assert-throws-on-orphan-obligation contract described in
 * `boot-totality.js`. Three axes covered:
 *
 *   1. Real manifest — clean, assert does NOT throw. Locks in the
 *      current state as green so any future regression (a new
 *      obligation authored but never wired into a page) is caught by
 *      this test file — not by a live smoke walk.
 *
 *   2. Synthetic uncovered obligation — the RED case. A tiny fixture
 *      manifest with a scalar obligation that no page presents fires
 *      the throw with the expected message shape.
 *
 *   3. Exclusion policy — structural group containers (no page
 *      presents them) and system-populated fields (`SYSTEM_POPULATED`)
 *      pass through without tripping the assert. Both pins are
 *      important: the group exclusion because it's cross-cutting
 *      (mirrors `obligations.js` `groups` computation), the system-
 *      populated one because it names the two V4 completeness fields
 *      that legitimately never appear on a page.
 *
 * The message-shape assertion (each case) matches A's boot-time
 * diagnostic — `Obligations collected by no page: <names>` — so
 * cross-branch stack traces read the same.
 */

import { describe, it, expect } from 'vitest'
import {
  assertObligationTotality,
  collectPresentedObligationIds,
  SYSTEM_POPULATED
} from './boot-totality.js'
import { flow } from './flow.js'
import { obligations as v4Obligations } from '../obligations/obligations.js'

// ---------------------------------------------------------------------------
// Tiny synthetic obligations + flow. These fixtures deliberately do NOT
// import from `obligations.js` — the assert is a pure function over the
// shape and must work equally against a hand-built manifest. See
// `analysis/reachability.test.js` for the same synthetic-manifest
// pattern.
// ---------------------------------------------------------------------------

const oblA = { id: 'obl-a', name: 'oblA' }
const oblB = { id: 'obl-b', name: 'oblB' }
const oblOrphan = { id: 'obl-orphan', name: 'oblOrphan' }

const groupContainer = { id: 'grp', name: 'groupContainer' }
const groupChild = {
  id: 'grp-child',
  name: 'groupChild',
  within: groupContainer
}

/**
 * Build a minimal flow tree that presents a given list of obligations
 * on one page each. Keeps the tests declarative — the assert only
 * cares about page.presents / page.presentsForEach.
 */
function flowPresenting(...obligations) {
  return {
    sections: [
      {
        children: obligations.map((o, i) => ({
          page: `page-${i}`,
          presents: [{ obligation: o }]
        }))
      }
    ]
  }
}

describe('assertObligationTotality — real manifest', () => {
  it('does not throw for the real B manifest + flow (pins current clean state)', () => {
    // If a future commit adds an obligation without wiring it into
    // flow.js, this fires with `Obligations collected by no page:
    // <name>` — same seam A closes at boot in `flow/dispatch.js:55-63`.
    expect(() => assertObligationTotality(v4Obligations, flow)).not.toThrow()
  })
})

describe('assertObligationTotality — synthetic orphan obligation', () => {
  it('throws when an obligation is not referenced by any page', () => {
    const obligations = [oblA, oblOrphan]
    const flow = flowPresenting(oblA) // oblOrphan is silently invisible.
    expect(() => assertObligationTotality(obligations, flow)).toThrow(
      /Obligations collected by no page: oblOrphan/
    )
  })

  it('names EVERY offending obligation, not just the first', () => {
    // Regression: earlier drafts of A's dispatch listed only the first
    // uncovered id, hiding parallel defects. The port keeps the full
    // list; test pins it so a future terse rewrite fails here.
    const obligations = [oblA, oblOrphan, oblB]
    const flow = flowPresenting(oblA)
    let caught
    try {
      assertObligationTotality(obligations, flow)
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(Error)
    expect(caught.message).toContain('oblOrphan')
    expect(caught.message).toContain('oblB')
  })

  it('does not throw when every obligation is presented', () => {
    const obligations = [oblA, oblB]
    const flow = flowPresenting(oblA, oblB)
    expect(() => assertObligationTotality(obligations, flow)).not.toThrow()
  })

  it('picks up obligations presented via presentsForEach (not just presents)', () => {
    // presentsForEach expands per group-instance at runtime, but at
    // boot time the assert only cares that SOMEONE presents each
    // obligation. Same coverage guarantee as `presents`.
    const obligations = [groupContainer, groupChild]
    const flow = {
      sections: [
        {
          children: [
            {
              page: 'child-page',
              presentsForEach: {
                obligation: groupChild,
                forEachOf: groupContainer
              }
            }
          ]
        }
      ]
    }
    expect(() => assertObligationTotality(obligations, flow)).not.toThrow()
  })
})

describe('assertObligationTotality — exclusion policy', () => {
  it('excludes structural group containers (referenced via `within` by another obligation)', () => {
    // groupContainer is a structural group — no page ever presents it
    // directly; its child (groupChild) does. The assert must recognise
    // the group-container role via the `within` back-reference and
    // exclude it from the uncovered check.
    const obligations = [groupContainer, groupChild]
    const flow = flowPresenting(groupChild)
    expect(() => assertObligationTotality(obligations, flow)).not.toThrow()
  })

  it('still flags a non-container obligation with no children as uncovered', () => {
    // Boundary: an obligation that isn't referenced by anyone's
    // `within` is NOT structural; it's a leaf that should be
    // presented. Prevents the exclusion policy over-generalising.
    const loneLeaf = { id: 'lone', name: 'loneLeaf' }
    expect(() =>
      assertObligationTotality([loneLeaf], { sections: [] })
    ).toThrow(/Obligations collected by no page: loneLeaf/)
  })

  it('excludes system-populated obligations by name (SYSTEM_POPULATED set)', () => {
    // Mirrors A's `obligation.system === true` exclusion — B doesn't
    // ship a `system` flag on the manifest declarations, so the policy
    // is expressed as a name allow-list on the boot-totality module.
    // The two V4 completeness fields (`poApprovedReferenceNumber`,
    // `responsiblePersonForLoad`) are minted / consumed upstream and
    // correctly never appear on any page.
    for (const name of SYSTEM_POPULATED) {
      const systemObl = { id: `system-${name}`, name }
      expect(() =>
        assertObligationTotality([systemObl], { sections: [] })
      ).not.toThrow()
    }
  })

  it('SYSTEM_POPULATED entries all correspond to obligations in the real manifest', () => {
    // Guard against drift the other way: if either name is renamed in
    // obligations.js the allow-list must move with it. Same pattern
    // as coverage.test.js's KNOWN_UNWIRED orphan check.
    const names = new Set(v4Obligations.map((o) => o.name))
    const orphans = [...SYSTEM_POPULATED].filter((name) => !names.has(name))
    expect(orphans).toEqual([])
  })
})

describe('collectPresentedObligationIds', () => {
  it('collects ids from both `presents` and `presentsForEach`', () => {
    const flow = {
      sections: [
        {
          children: [
            {
              page: 'p1',
              presents: [{ obligation: oblA }, { obligation: oblB }]
            },
            {
              page: 'p2',
              presentsForEach: {
                obligation: groupChild,
                forEachOf: groupContainer
              }
            }
          ]
        }
      ]
    }
    const ids = collectPresentedObligationIds(flow)
    expect(ids.has(oblA.id)).toBe(true)
    expect(ids.has(oblB.id)).toBe(true)
    expect(ids.has(groupChild.id)).toBe(true)
    expect(ids.has(groupContainer.id)).toBe(false)
  })

  it('returns an empty set for a flow with no pages', () => {
    expect(collectPresentedObligationIds({ sections: [] }).size).toBe(0)
  })
})
