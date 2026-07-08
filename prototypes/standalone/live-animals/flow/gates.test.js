import { beforeAll, describe, expect, it } from 'vitest'

import { dispatchPages } from '../features/index.js'
import { transportersSelectPage } from '../features/transport/page.js'
import { notificationViewPage } from '../features/check-answers/page.js'
import { reconcile } from '../engine/evaluate/reconcile.js'
import { enumerateScopeStates } from '../analysis/reachability.js'
import { buildDispatch } from './dispatch.js'
import { sections } from './flow.js'
import { pageGatePasses, sectionGatePasses } from './gates.js'

describe('#pageGatePasses / #sectionGatePasses', () => {
  const dynamicSections = sections.filter((section) => section.dynamic)
  // get-your-quote was the ONLY authored `gate:` this flow ever carried, and it
  // went with the quote feature in inc-028 — so no LIVE section exercises the
  // authored-gate short-circuit any more. The mechanism (gates.js honouring an
  // explicit `gate:`) is kept, so drive it with a synthetic section/page: this
  // proves an authored gate is read WITHOUT the dispatch index, exactly as the
  // quote section used to.
  const syntheticGatedSection = {
    id: 'synthetic',
    gate: (scope) => scope.pass === true,
    pages: []
  }
  const syntheticGatedPage = { id: 'synthetic', gate: (scope) => scope.pass }
  // Every live section now derives its gate from collects; grab one to exercise
  // the pre-build fail-loud path.
  const derivedSection = sections.find((section) => !section.gate)

  // These two run BEFORE the nested suite's beforeAll builds the index —
  // this file's module registry is fresh (vitest isolates per file), so the
  // dispatch index really is unbuilt here.
  it('Should fail loud when a derived gate is consulted before the dispatch index is built', () => {
    const scope = { inScope: new Set() }
    expect(() => sectionGatePasses(derivedSection, scope)).toThrow(
      /buildDispatch/
    )
    expect(() => pageGatePasses(transportersSelectPage, scope)).toThrow(
      /buildDispatch/
    )
  })

  it('Should evaluate an authored gate without needing the dispatch index', () => {
    expect(sectionGatePasses(syntheticGatedSection, { pass: false })).toBe(
      false
    )
    expect(sectionGatePasses(syntheticGatedSection, { pass: true })).toBe(true)
    expect(pageGatePasses(syntheticGatedPage, { pass: false })).toBe(false)
    expect(pageGatePasses(syntheticGatedPage, { pass: true })).toBe(true)
  })

  it('Should carry no authored section gate any more — every live section derives its gate from collects (T11; get-your-quote went inc-028)', () => {
    // The only authored `gate:` was get-your-quote's `readyForQuote` roll-up.
    // Removing it leaves the flow purely collects-derived — this guards against
    // an authored section gate being smuggled back in.
    expect(sections.filter((section) => section.gate)).toEqual([])
  })

  describe('once the dispatch index is built', () => {
    beforeAll(() => buildDispatch(dispatchPages))

    it('Should carry no dynamic-marked section any more — the add-on marker is unused after inc-027', () => {
      // protected-ncd was the last `dynamic: true` section (named-driver went
      // inc-025, modifications inc-026). The marker mechanism still exists in
      // flow.js/gates but nothing sets it now, and no live section's derived
      // gate ever goes Not Applicable — so the old add-on biconditional has no
      // carrier. This guards against the marker silently returning.
      expect(dynamicSections).toEqual([])
    })

    it('Should pass the derived transporter-select page gate exactly when the commercial transporter is owed, in every scope state', () => {
      for (const answers of enumerateScopeStates()) {
        const { inScope } = reconcile(answers)
        expect(pageGatePasses(transportersSelectPage, { inScope })).toBe(
          inScope.has('commercialTransporter')
        )
      }
    })

    it('Should derive a page that collects nothing as reachable (the empty-collects convention)', () => {
      // notification-view (the CYA) collects nothing — it is not in
      // dispatchPages, so collectsOf returns [] and the page derives reachable.
      expect(pageGatePasses(notificationViewPage, { inScope: new Set() })).toBe(
        true
      )
    })
  })
})
