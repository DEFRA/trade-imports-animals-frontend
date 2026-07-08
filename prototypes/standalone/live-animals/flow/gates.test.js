import { beforeAll, describe, expect, it } from 'vitest'

import { dispatchPages } from '../features/index.js'
import { transportersSelectPage } from '../features/transport/page.js'
import { quoteSummaryPage } from '../features/quote/page.js'
import { reconcile } from '../engine/evaluate/reconcile.js'
import { NA } from '../engine/status.js'
import { enumerateScopeStates } from '../analysis/reachability.js'
import { buildDispatch } from './dispatch.js'
import { sections } from './flow.js'
import { sectionStatus } from './section-status.js'
import { pageGatePasses, sectionGatePasses } from './gates.js'

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
