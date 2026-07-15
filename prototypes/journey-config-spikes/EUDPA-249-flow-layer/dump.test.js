/**
 * dump.js snapshot tests — pin the shape of the logical-model output so
 * a change to the flow, domain, or runtime that alters what a
 * stakeholder sees in the browser also surfaces here.
 */

import { describe, it, expect } from 'vitest'
import { report } from './dump.js'

describe('dump.report(empty)', () => {
  it('produces the empty-session summary', () => {
    const out = report('empty')
    expect(out.journeyState).toBe('not-started')
    expect(out.startPage).toBe('country-of-origin')
    // Every subsection with mandatory presented obligations is NS.
    expect(out.statusPerSubsection.origin).toBe('not-started')
    expect(out.statusPerSubsection.reason).toBe('not-started')
    // The certified-for subsection is NS because the lookup obligation
    // starts unfulfilled and its sibling animalsCertifiedFor is
    // mandatory.
    expect(out.statusPerSubsection['certified-for']).toBe('not-started')
    // The `commodity-lines-manage` subsection contains only a read-
    // only intro (no presented obligations, no group), so its rollup
    // stays NA even after the minEntries floor lands. (Hub UI
    // patches this label to "Not started" via linesManageStatus for
    // clickability — that's a hub-local concern, not engine-level.)
    expect(out.statusPerSubsection['commodity-lines-manage']).toBe(
      'not-applicable'
    )
    // `commodity-lines-details` presents commodityLine-scoped pages.
    // With `commodityLine.requires.minEntries: 1` (REPORT §7 fix),
    // zero records triggers a MIN_ENTRIES group error →
    // classifyEntries returns NS instead of collapsing to NA.
    expect(out.statusPerSubsection['commodity-lines-details']).toBe(
      'not-started'
    )
    // Nothing missing yet on unfilled pages we haven't visited.
    expect(out.missingRequired.length).toBeGreaterThan(0)
  })
})

describe('dump.report(internal-market-partial)', () => {
  it('reflects reason set, purpose still pending', () => {
    const out = report('internal-market-partial')
    expect(out.journeyState).toBe('in-progress')
    expect(out.startPage).toBe('purpose-details')
    expect(out.statusPerSubsection.origin).toBe('fulfilled')
    expect(out.statusPerSubsection.reason).toBe('in-progress')
    // Purpose is in scope + NS.
    expect(out.statusPerPage['purpose-details']).toBe('not-started')
    // purpose is in the missing-required list.
    expect(
      out.missingRequired.some(
        (m) => m.obligation === 'purposeInInternalMarket'
      )
    ).toBe(true)
  })
})

describe('dump.report(transit-with-lines)', () => {
  it('reflects a partly-populated journey with one commodity line', () => {
    const out = report('transit-with-lines')
    expect(out.journeyState).not.toBe('not-started')
    // Purpose is NA on transit path.
    expect(out.statusPerPage['purpose-details']).toBe('not-applicable')
    // Country + reason subsections are F.
    expect(out.statusPerSubsection.origin).toBe('fulfilled')
    expect(out.statusPerSubsection.reason).toBe('fulfilled')
    // Commodity-lines-details subsection is at least IP because a line
    // exists and per-line data is partial.
    expect(
      ['in-progress', 'fulfilled'].includes(
        out.statusPerSubsection['commodity-lines-details']
      )
    ).toBe(true)
  })
})
