import { beforeAll, describe, expect, it } from 'vitest'

import { dispatchPages } from '../features/index.js'
import { transportersSelectPage } from '../features/transport/page.js'
import { quoteSummaryPage } from '../features/quote/page.js'
import { reconcile } from '../engine/evaluate/reconcile.js'
import { enumerateScopeStates } from '../analysis/reachability.js'
import { buildDispatch } from './dispatch.js'
import { sections } from './flow.js'
import { pageGatePasses, sectionGatePasses } from './gates.js'

describe('#pageGatePasses / #sectionGatePasses', () => {
  const dynamicSections = sections.filter((section) => section.dynamic)
  const quoteSection = sections.find(
    (section) => section.id === 'get-your-quote'
  )
  // Every section but the quote derives its gate from collects; grab one to
  // exercise the pre-build fail-loud path (protected-ncd was the anchor before
  // inc-027 removed the last dynamic section).
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
    expect(sectionGatePasses(quoteSection, { readyForQuote: false })).toBe(
      false
    )
    expect(sectionGatePasses(quoteSection, { readyForQuote: true })).toBe(true)
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
      expect(pageGatePasses(quoteSummaryPage, { inScope: new Set() })).toBe(
        true
      )
    })
  })
})
