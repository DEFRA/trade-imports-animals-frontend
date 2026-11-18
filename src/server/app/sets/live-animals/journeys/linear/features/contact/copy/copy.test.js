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
    expect(result.view.context.sharedCopy.saveActions.saveAndContinue).toBe(
      'Save and continue'
    )
  })
})
