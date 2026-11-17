import { SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'
import { leaves } from '../../../../../../../shared/copy-leaves.js'

import {
  driveHandler,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'

import * as cphNumber from '../controller.js'
import { copy } from './copy.en.js'
import { copy as copyCy } from './copy.cy.js'

describe('cph-number copy module', () => {
  it('Should have a non-empty string at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      expect(typeof value, `${path} must be a string`).toBe('string')
      expect(value.trim().length, `${path} must not be empty`).toBeGreaterThan(
        0
      )
    }
  })

  it('Should head the page with an instruction and name the group short', () => {
    expect(copy.title).toBe('Add the county parish holding number (CPH)')
    expect(copy.cph.legend).toBe('CPH number')
    expect(copyCy.title).toBe('Ychwanegu rhif daliad plwyf sirol (CPH)')
    expect(copyCy.cph.legend).toBe('Rhif CPH')
  })

  it('Should name each part of the number', () => {
    expect(copy.cph.county).toBe('County')
    expect(copy.cph.parish).toBe('Parish')
    expect(copy.cph.holding).toBe('Holding number')
    expect(copyCy.cph.county).toBe('Sir')
    expect(copyCy.cph.parish).toBe('Plwyf')
    expect(copyCy.cph.holding).toBe('Rhif daliad')
  })

  it('Should give an example in the real 2/3/4 grouping, with no punctuation', () => {
    expect(copy.cph.hint).toBe('For example 12/345/6789')
    expect(copyCy.cph.hint).toBe('Er enghraifft 12/345/6789')
  })

  it('Should explain what a CPH number is and where to find one', () => {
    expect(copy.help.summary).toBe('What is a CPH number?')
    expect(copy.help.definition).toBe(
      'A county parish holding (CPH) number is a unique 9-digit number used to identify land and buildings where livestock are kept, moved or handled.'
    )
    expect(copy.help.whereToFindPrefix).toBe(
      'You can find your CPH number on documents from the Animal and Plant Health Agency (APHA) or by'
    )
    expect(copy.help.whereToFindLink).toBe(
      'checking your holding details on GOV.UK'
    )
    expect(copy.help.whereToFindHref).toBe(
      'https://www.gov.uk/guidance/get-a-county-parish-holding-cph-number'
    )
    expect(copyCy.help.summary).toBe('Beth yw rhif CPH?')
    expect(copyCy.help.whereToFindPrefix).toBe(
      "Gallwch ddod o hyd i'ch rhif CPH ar ddogfennau gan yr Asiantaeth Iechyd Anifeiliaid a Phlanhigion (APHA) neu drwy"
    )
    expect(copyCy.help.whereToFindLink).toBe(
      'wirio manylion eich daliad ar GOV.UK'
    )
    expect(copyCy.help.whereToFindHref).toBe(
      'https://www.gov.uk/guidance/get-a-county-parish-holding-cph-number'
    )
  })
})

describe('GET cph-number — copy reaches the view', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  const seed = () => ({ commodityLines: [{ commodityCode: '0102' }] })

  it('Should supply the feature copy module and the shared chrome copy', async () => {
    const get = cphNumber.routes.find((route) => route.method === 'GET').handler
    const result = await driveHandler(get, { seed: seed() })
    expect(result.view.context.copy).toBe(copy)
    expect(result.view.context.pageTitle).toBe(copy.title)
    expect(result.view.context.sharedCopy.saveActions.saveAndContinue).toBe(
      'Save and continue'
    )
  })
})
