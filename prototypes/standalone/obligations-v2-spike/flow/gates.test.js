import { beforeAll, describe, expect, it } from 'vitest'

import { dispatchPages } from '../features/index.js'
import { claimsPage } from '../features/claims/page.js'
import { quoteSummaryPage } from '../features/quote/page.js'
import { reconcile } from '../engine/evaluate/reconcile.js'
import { NA } from '../engine/status.js'
import { enumerateScopeStates } from '../analysis/reachability.js'
import { buildDispatch } from './dispatch.js'
import { sections } from './flow.js'
import { sectionStatus } from './section-status.js'
import { pageGatePasses, sectionGatePasses } from './gates.js'

/**
 * The derived-gate seam: default gates come from `collects` + the obligation
 * model; an authored `gate` overrides. The invariant test pins the
 * equivalence the design rests on — derived gate ⟺ section not
 * Not Applicable — across the SAME enumerated scope space the reachability
 * prover walks, rather than sampling personas.
 */
describe('#pageGatePasses / #sectionGatePasses', () => {
  const dynamicSections = sections.filter((section) => section.dynamic)
  const quoteSection = sections.find(
    (section) => section.id === 'get-your-quote'
  )

  // These two run BEFORE the nested suite's beforeAll builds the index —
  // this file's module registry is fresh (vitest isolates per file), so the
  // dispatch index really is unbuilt here.
  it('Should fail loud when a derived gate is consulted before the dispatch index is built', () => {
    const scope = { inScope: new Set() }
    expect(() => sectionGatePasses(dynamicSections[0], scope)).toThrow(
      /buildDispatch/
    )
    expect(() => pageGatePasses(claimsPage, scope)).toThrow(/buildDispatch/)
  })

  it('Should evaluate an authored gate without needing the dispatch index', () => {
    expect(sectionGatePasses(quoteSection, { readyForQuote: false })).toBe(
      false
    )
    expect(sectionGatePasses(quoteSection, { readyForQuote: true })).toBe(true)
  })

  describe('once the dispatch index is built', () => {
    beforeAll(() => buildDispatch(dispatchPages))

    it('Should pass a derived section gate exactly when the section is not Not Applicable, in every scope state', () => {
      // Non-vacuity: the three add-on sections are the derived section gates.
      expect(dynamicSections.map((section) => section.id)).toEqual([
        'named-driver',
        'modifications',
        'protected-ncd'
      ])

      const mismatches = []
      for (const answers of enumerateScopeStates()) {
        const { inScope } = reconcile(answers)
        for (const section of dynamicSections) {
          const gatePasses = sectionGatePasses(section, { inScope })
          const notApplicable = sectionStatus(section, answers, inScope) === NA
          if (gatePasses === notApplicable) {
            mismatches.push({ section: section.id, answers, gatePasses })
          }
        }
      }
      expect(mismatches).toEqual([])
    })

    it('Should pass the derived claims page gate exactly when the claims obligation is owed, in every scope state', () => {
      for (const answers of enumerateScopeStates()) {
        const { inScope } = reconcile(answers)
        expect(pageGatePasses(claimsPage, { inScope })).toBe(
          inScope.has('claims')
        )
      }
    })

    it('Should derive a page that collects nothing as reachable (the empty-collects convention)', () => {
      // quote-summary collects only the system `premium` obligation, so its
      // page-level derivation passes; restricting it is the job of its
      // section's authored readyForQuote gate.
      expect(pageGatePasses(quoteSummaryPage, { inScope: new Set() })).toBe(
        true
      )
    })
  })
})
