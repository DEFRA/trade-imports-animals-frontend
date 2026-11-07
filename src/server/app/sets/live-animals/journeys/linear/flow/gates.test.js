import { SET_ID } from '../../../set.js'
import { beforeAll, describe, expect, it } from 'vitest'

import { dispatchPages } from '../features/index.js'
import { transitCountriesPage } from '../features/transport/page.js'
import { commoditiesPage } from '../features/commodities/page.js'
import { notificationViewPage } from '../features/check-answers/page.js'
import { makeScope } from '../../../../../engine/index.js'
import { completeNotification } from '../../../../../engine/test-support.js'
import { enumerateScopeStates } from './reachability-fixtures/scope-states.js'
import { buildDispatch } from '../../../../../flow/dispatch.js'
import { sections } from './flow.js'
import { pageGatePasses, sectionGatePasses } from '../../../../../flow/gates.js'

describe('#pageGatePasses / #sectionGatePasses', () => {
  const syntheticGatedSection = {
    id: 'synthetic',
    gate: (scope) => scope.pass === true,
    pages: []
  }
  const syntheticGatedPage = { id: 'synthetic', gate: (scope) => scope.pass }
  const derivedSection = sections.find((section) => !section.gate)

  it('Should fail loud when a derived gate is consulted before the dispatch index is built', () => {
    const scope = { inScope: new Set() }
    expect(() => sectionGatePasses(derivedSection, scope)).toThrow(
      /buildDispatch/
    )
    expect(() => pageGatePasses(transitCountriesPage, scope)).toThrow(
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

  it('Should author a gate on the review section alone — every other section derives its gate from the dispatch index', () => {
    const review = sections.find((section) => section.id === 'review')
    expect(sectionGatePasses(review, { readyForCheckYourAnswers: false })).toBe(
      false
    )
    expect(sectionGatePasses(review, { readyForCheckYourAnswers: true })).toBe(
      true
    )
    for (const section of sections.filter((s) => s.id !== 'review')) {
      expect(() =>
        sectionGatePasses(section, { inScope: new Set(), answered: () => true })
      ).toThrow(/buildDispatch/)
    }
  })

  describe('once the dispatch index is built', () => {
    beforeAll(() => {
      buildDispatch(SET_ID, dispatchPages)
    })

    it('Should pass the derived transit-countries page gate exactly when the transited countries are owed, in every scope state', () => {
      const answered = () => true
      for (const answers of enumerateScopeStates()) {
        const { inScope } = makeScope(answers)
        expect(
          pageGatePasses(transitCountriesPage, { inScope, answered })
        ).toBe(inScope.has('transitedCountries'))
      }
    })

    it('Should derive a page that collects nothing as reachable (the empty-collects convention)', () => {
      expect(
        pageGatePasses(notificationViewPage, {
          inScope: new Set(),
          answered: () => true
        })
      ).toBe(true)
    })
  })
})

describe('#sectionGatePasses — sections open in mandate order', () => {
  beforeAll(() => {
    buildDispatch(SET_ID, dispatchPages)
  })

  const sectionById = (id) => sections.find((section) => section.id === id)
  const gatePasses = (id, answers) =>
    sectionGatePasses(sectionById(id), makeScope(answers))

  it('Should always open the first section — its first page owns the first continue obligation, nothing precedes it', () => {
    expect(gatePasses('about-the-consignment', {})).toBe(true)
  })

  it('Should gate What are you importing? until countryOfOrigin is answered', () => {
    const scopeFor = (answers) => makeScope(answers)
    expect(pageGatePasses(commoditiesPage, scopeFor({}))).toBe(false)
    expect(
      pageGatePasses(commoditiesPage, scopeFor({ countryOfOrigin: 'FR' }))
    ).toBe(true)
  })

  it('Should gate every section after What are you importing? until an item-level commodityCode is answered', () => {
    const afterCommodities = [
      'description-of-the-goods',
      'transport-and-arrival',
      'documents',
      'consignment-parties',
      'contact-address'
    ]
    const originOnly = { countryOfOrigin: 'FR' }
    const blankLine = { countryOfOrigin: 'FR', commodityLines: [{}] }
    const filledLine = {
      countryOfOrigin: 'FR',
      commodityLines: [{}, { commodityCode: '0102' }]
    }
    for (const id of afterCommodities) {
      expect(gatePasses(id, originOnly)).toBe(false)
      expect(gatePasses(id, blankLine)).toBe(false)
      expect(gatePasses(id, filledLine)).toBe(true)
    }
  })

  it('Should open the transport, parties and contact sections before any document is answered', () => {
    const noDocuments = {
      countryOfOrigin: 'FR',
      commodityLines: [{ commodityCode: '0102' }]
    }
    expect(gatePasses('consignment-parties', noDocuments)).toBe(true)
    expect(gatePasses('transport-and-arrival', noDocuments)).toBe(true)
    expect(gatePasses('contact-address', noDocuments)).toBe(true)
  })
})

describe('#sectionGatePasses — the review opens on submit-readiness', () => {
  beforeAll(() => {
    buildDispatch(SET_ID, dispatchPages)
  })

  const reviewSection = sections.find((section) => section.id === 'review')

  const allAnswerSectionsReady = completeNotification()
  delete allAnswerSectionsReady.declaration

  it('Should lock the review section on a blank journey', () => {
    expect(sectionGatePasses(reviewSection, makeScope({}))).toBe(false)
  })

  it('Should open the review section once every answer section is ready — even with the declaration unanswered (no deadlock)', () => {
    expect(
      sectionGatePasses(reviewSection, makeScope(allAnswerSectionsReady))
    ).toBe(true)
  })
})
