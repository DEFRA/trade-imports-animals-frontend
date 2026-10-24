import { SET_ID } from '../../../set.js'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { dispatchPages } from '../features/index.js'
import { makeScope } from '../../../../../engine/index.js'
import { completeNotification } from '../../../../../engine/test-support.js'
import { evaluateAnswers } from '../../../../../bridge/evaluation.js'
import * as obligationSource from '../../../../../bridge/obligation-source.js'
import { readyForCheckYourAnswers } from '../../../../../flow/section-status.js'
import {
  buildDispatch,
  collectsOf,
  pageOfObligation,
  slugOfPage
} from '../../../../../flow/dispatch.js'
import {
  nextInSection,
  nextInTaskRow,
  sectionEntry
} from '../../../../../flow/navigation.js'

const completeAnswers = completeNotification()

const nextInTaskRowTests = () => {
  const scope = {
    inScope: makeScope(completeAnswers).inScope,
    answered: () => true
  }
  const hub = /\/notifications\/journey-1$/

  it('Should return What are you importing? to the hub rather than on to the commodity details', () => {
    expect(nextInTaskRow('commodities', scope, 'journey-1')).toMatch(hub)
    expect(nextInSection('commodities', scope, 'journey-1')).toMatch(
      /\/consignment-details$/
    )
  })

  it('Should return the main reason for import to the hub rather than on to the additional details', () => {
    expect(nextInTaskRow('import-reason', scope, 'journey-1')).toMatch(hub)
    expect(nextInSection('import-reason', scope, 'journey-1')).toMatch(
      /\/additional-details$/
    )
  })

  it('Should return the arrival details to the hub rather than on to the transit countries', () => {
    expect(nextInTaskRow('port-of-entry', scope, 'journey-1')).toMatch(hub)
    expect(nextInSection('port-of-entry', scope, 'journey-1')).toMatch(
      /\/transit-countries$/
    )
  })

  it('Should return the transit countries to the hub rather than on to the transporter list', () => {
    expect(nextInTaskRow('transit-countries', scope, 'journey-1')).toMatch(hub)
    expect(nextInSection('transit-countries', scope, 'journey-1')).toMatch(
      /\/transporters$/
    )
  })

  it('Should return the roles and addresses to the hub, the last page of its task', () => {
    expect(nextInTaskRow('addresses', scope, 'journey-1')).toMatch(hub)
  })

  it('Should hand the CPH number back to roles and addresses, the next page of the same task', () => {
    expect(nextInTaskRow('cphNumber', scope, 'journey-1')).toMatch(
      /\/addresses$/
    )
  })

  it('Should keep check your answers leading on to the declaration — it belongs to no task row', () => {
    const ready = { ...scope, readyForCheckYourAnswers: true }
    expect(nextInTaskRow('notification-view', ready, 'journey-1')).toMatch(
      /\/declaration$/
    )
  })

  it('Should return a page in no section to the hub', () => {
    expect(nextInTaskRow('not-a-real-page', scope, 'journey-1')).toMatch(hub)
  })
}

describe('#buildDispatch', () => {
  beforeAll(() => {
    buildDispatch(SET_ID, dispatchPages)
  })

  it('Should build the dispatch without throwing for every non-system obligation', () => {
    expect(() => buildDispatch(SET_ID, dispatchPages)).not.toThrow()
  })

  it('Should resolve pageOfObligation for a top-level obligation', () => {
    expect(pageOfObligation('countryOfOrigin')).toBe('origin')
  })

  it('Should resolve pageOfObligation for a collection obligation', () => {
    expect(pageOfObligation('commodityLines')).toBe('commodities')
  })

  it('Should resolve pageOfObligation for a gated obligation', () => {
    expect(pageOfObligation('commercialTransporter')).toBe('transporters')
    expect(pageOfObligation('privateTransporter')).toBe('transporters')
  })

  it('Should list collectsOf for a page', () => {
    expect(collectsOf('origin')).toContain('countryOfOrigin')
  })

  it('Should return slugOfPage for a page', () => {
    expect(slugOfPage('origin')).toBe('origin')
  })

  it('Should crash boot when an obligation id carries a path metacharacter', () => {
    const spy = vi
      .spyOn(obligationSource, 'walkObligations')
      .mockImplementation(function* () {
        yield {
          templatePath: 'commodityLines.animalIdentifiers',
          obligation: { name: 'bad.id' }
        }
      })
    try {
      expect(() => buildDispatch(SET_ID, [{ id: 'x', collects: [] }])).toThrow(
        /contains a path metacharacter/
      )
      expect(() => buildDispatch(SET_ID, [{ id: 'x', collects: [] }])).toThrow(
        /"bad\.id"/
      )
    } finally {
      spy.mockRestore()
      buildDispatch(SET_ID, dispatchPages)
    }
  })

  it('Should crash boot when a single obligation is collected by two pages', () => {
    const twoOwners = [
      { id: 'a', collects: ['countryOfOrigin'] },
      { id: 'b', collects: ['countryOfOrigin'] }
    ]
    try {
      expect(() => buildDispatch(SET_ID, twoOwners)).toThrow(
        /collected by two pages/
      )
      expect(() => buildDispatch(SET_ID, twoOwners)).toThrow(/"a" and "b"/)
    } finally {
      buildDispatch(SET_ID, dispatchPages)
    }
  })

  it('Should fall back to the hub when the page belongs to no section', () => {
    expect(
      nextInSection(
        'not-a-real-page',
        {
          inScope: new Set(),
          answered: () => true
        },
        'journey-1'
      )
    ).toMatch(/\/notifications\/journey-1$/)
  })

  it('Should crash boot when an obligation (and its derived sub-obligations) is uncovered', () => {
    const withoutCommodities = dispatchPages.filter(
      (page) => page.id !== 'commodities'
    )
    expect(() => buildDispatch(SET_ID, withoutCommodities)).toThrow(
      /collected by no page/
    )
    expect(() => buildDispatch(SET_ID, withoutCommodities)).toThrow(
      /commodityLines/
    )
    buildDispatch(SET_ID, dispatchPages)
  })

  it('Should resolve a sub-obligation to its collection owner by template and instance address', () => {
    expect(pageOfObligation('commodityLines.commodityCode')).toBe('commodities')
    expect(pageOfObligation('commodityLines[0].commodityCode')).toBe(
      'commodities'
    )
    expect(pageOfObligation('commodityLines[0]')).toBe('commodities')
  })

  it('Should end the transport section at the transporter list, whatever type the answers reach', () => {
    const answered = () => true
    const scopeNoType = { inScope: makeScope({}).inScope, answered }
    const scopeCommercial = {
      inScope: makeScope({ transporterType: 'Commercial' }).inScope,
      answered
    }
    const scopePrivate = {
      inScope: makeScope({ transporterType: 'Private' }).inScope,
      answered
    }
    for (const scope of [scopeNoType, scopeCommercial, scopePrivate]) {
      expect(nextInSection('transporters', scope, 'journey-1')).toMatch(
        /\/notifications\/journey-1$/
      )
    }
  })

  it('Should keep the add spokes off the journey — they belong to no section', () => {
    const scope = {
      inScope: makeScope({ transporterType: 'Private' }).inScope,
      answered: () => true
    }
    for (const spoke of [
      'transporter-add',
      'transporters-select',
      'private-transporter-details'
    ]) {
      expect(nextInSection(spoke, scope, 'journey-1')).toMatch(
        /\/notifications\/journey-1$/
      )
    }
  })

  describe(
    '#nextInTaskRow — where a save outside the opening run goes',
    nextInTaskRowTests
  )

  it('Should enter a section at its first gated-in page', () => {
    const scope = { inScope: makeScope({}).inScope, answered: () => true }
    expect(sectionEntry('transport', scope, 'journey-1')).toMatch(
      /\/port-of-entry$/
    )
  })

  it('Should report ready-to-submit only once every section is complete', () => {
    const { inScope } = makeScope(completeAnswers)
    expect(
      readyForCheckYourAnswers(
        completeAnswers,
        inScope,
        evaluateAnswers(completeAnswers)
      )
    ).toBe(true)

    const incomplete = {
      countryOfOrigin: 'FR',
      regionOfOriginCodeRequirement: 'no'
    }
    expect(
      readyForCheckYourAnswers(
        incomplete,
        makeScope(incomplete).inScope,
        evaluateAnswers(incomplete)
      )
    ).toBe(false)
  })
})
