import { SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'

import {
  driveHandler,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import { itHoldsCopyAtEveryLeaf } from '../../../../../../../engine/copy-test-support.js'
import { dispatchPages } from '../../index.js'

import * as contact from '../controller.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'
import { copy as addressesCopy } from '../../addresses/copy/copy.en.js'

describe('contact copy module', () => {
  itHoldsCopyAtEveryLeaf(copy, cy)

  it('Should hold the intro sentence in English and in Welsh', () => {
    expect(copy.intro).toBe(
      'This is the contact address of the person responsible for the consignment from when it enters Great Britain until authorities complete their checks.'
    )
    expect(cy.intro).toBe(
      'Dyma gyfeiriad cyswllt y person sy’n gyfrifol am y llwyth o’r adeg y mae’n cyrraedd Prydain Fawr hyd nes bod yr awdurdodau wedi cwblhau eu gwiriadau.'
    )
  })

  it('Should hold the add-a-branch sentence as the design source sets it, in both locales', () => {
    expect(copy.addNewBranchAddress.before).toBe(
      'If the correct address is not shown, '
    )
    expect(copy.addNewBranchAddress.linkText).toBe('add a new branch address')
    expect(copy.addNewBranchAddress.after).toBe(', then return to this page.')
    expect(cy.addNewBranchAddress.before).toBe(
      'Os nad yw’r cyfeiriad cywir yn cael ei ddangos, '
    )
    expect(cy.addNewBranchAddress.linkText).toBe(
      'ychwanegwch gyfeiriad cangen newydd'
    )
    expect(cy.addNewBranchAddress.after).toBe(
      ', ac yna dewch yn ôl i’r dudalen hon.'
    )
  })

  it('Should hold the two return-control words as the design source sets them, with a Welsh draft that differs', () => {
    expect(copy.saveActions.saveAndReturnToHub).toBe('Save and return to hub')
    expect(copy.saveActions.cancelAndReturnToHub).toBe(
      'Cancel and return to hub'
    )
    expect(cy.saveActions.saveAndReturnToHub).not.toBe(
      copy.saveActions.saveAndReturnToHub
    )
    expect(cy.saveActions.cancelAndReturnToHub).not.toBe(
      copy.saveActions.cancelAndReturnToHub
    )
  })
})

describe('GET contact — copy reaches the view', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should supply the feature copy module, the page title and the choice sub-heading', async () => {
    const get = contact.routes.find((route) => route.method === 'GET').handler
    const result = await driveHandler(get)
    expect(result.view.context.copy).toBe(copy)
    expect(result.view.context.pageTitle).toBe(copy.title)
    expect(result.view.context.resultsHeading).toBe(
      addressesCopy.picker.resultsHeading
    )
    expect(result.view.context.saveActionsCopy.saveAndContinue).toBe(
      'Save and continue'
    )
    expect(result.view.context.saveActionsCopy.saveAndReturnToHub).toBe(
      'Save and return to hub'
    )
    expect(result.view.context.saveActionsCopy.cancelAndReturnToHub).toBe(
      'Cancel and return to hub'
    )
  })
})
