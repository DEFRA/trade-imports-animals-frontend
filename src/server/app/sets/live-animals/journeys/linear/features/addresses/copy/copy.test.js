import { SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'

import { leaves } from '../../../../../../../shared/copy-leaves.js'
import {
  driveHandler,
  sampleText,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'

import { copy as sectionCaptionsEn } from '../../../flow/section-captions/copy/copy.en.js'
import { copy as sectionCaptionsCy } from '../../../flow/section-captions/copy/copy.cy.js'
import * as addresses from '../controller.js'
import { PARTIES } from '../parties.js'
import { copy } from './copy.en.js'
import { copy as copyCy } from './copy.cy.js'

describe('#copy', () => {
  // Parameterised strings are copy FUNCTIONS: a leaf may be a function of
  // sample arguments returning the finished sentence.
  it('Should have a non-empty string (or string-returning function) at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      const text = sampleText(value, ['sample', 'sample'])
      expect(typeof text, `${path} must resolve to a string`).toBe('string')
      expect(text.trim().length, `${path} must not be empty`).toBeGreaterThan(0)
    }
  })

  it('Should word the results heading and interpolate the results count', () => {
    expect(copy.picker.resultsHeading).toBe('Select an address')
    expect(copy.picker.resultsCount(5, 40)).toBe('Showing 5 out of 40 results')
  })

  it('Should word the Welsh results heading and count', () => {
    expect(copyCy.picker.resultsHeading).toBe('Dewiswch gyfeiriad')
    expect(copyCy.picker.resultsCount(5, 40)).toBe(
      'Yn dangos 5 allan o 40 canlyniad'
    )
  })

  it.each([
    ['en', copy, sectionCaptionsEn],
    ['cy', copyCy, sectionCaptionsCy]
  ])(
    'Should caption the %s pickers with the section name their hub carries',
    (_locale, addressCopy, sectionCaptions) => {
      expect(addressCopy.picker.caption).toBe(
        sectionCaptions.sections.consignmentParties
      )
    }
  )

  it('Should keep the hub heading "Consignment addresses"', () => {
    expect(copy.hub.title).toBe('Consignment addresses')
  })

  it('Should word the CPH hub row and its hint in lower case with "number" after the abbreviation', () => {
    expect(copy.hub.cph.title).toBe('County parish holding (CPH) number')
    expect(copy.hub.cph.hint).toBe(
      'The county parish holding (CPH) number identifies the holding where the animals will be kept.'
    )
  })

  it('Should feed every party spoke its title, hint and error from the module', () => {
    for (const party of PARTIES) {
      expect(party.title).toBe(copy.parties[party.id].title)
      expect(party.hint).toBe(copy.parties[party.id].hint)
      expect(party.error).toBe(copy.parties[party.id].error)
    }
  })
})

describe('GET consignment addresses — copy reaches the view', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should supply the hub copy namespace and the shared chrome copy', async () => {
    const get = addresses.routes.find((route) => route.method === 'GET').handler
    const result = await driveHandler(get)
    expect(result.view.context.copy).toBe(copy.hub)
    expect(result.view.context.pageTitle).toBe(copy.hub.title)
    expect(result.view.context.sharedCopy.saveActions.saveAndContinue).toBe(
      'Save and continue'
    )
    expect(result.view.context.rows.at(0).value.text).toBe(copy.hub.notAddedYet)
  })
})
