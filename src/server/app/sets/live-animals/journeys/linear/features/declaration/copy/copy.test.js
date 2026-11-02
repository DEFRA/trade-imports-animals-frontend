import { SET_ID } from '../../../../../set.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { leaves } from '../../../../../../../shared/copy-leaves.js'

import {
  driveHandler,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import { configureReadyForCheckYourAnswers } from '../../../../../../../engine/read.js'
import { dispatchPages } from '../../index.js'

import { declarationRoutesFromReview } from '../test-support.js'
import { copy } from './copy.en.js'
import { copy as copyCy } from './copy.cy.js'

describe('declaration copy module', () => {
  it('Should have a non-empty string at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      expect(typeof value, `${path} must be a string`).toBe('string')
      expect(value.trim().length, `${path} must not be empty`).toBeGreaterThan(
        0
      )
    }
  })

  it('Should name the regulation the contact statement sits under', () => {
    expect(copy.body.contactUkDetail).toBe(
      'I am complying with the requirements of Regulation (EU) 2017/625 including on animal health and welfare.'
    )
    expect(copyCy.body.contactUkDetail).toBe(
      'Rwy’n cydymffurfio â gofynion Rheoliad (EU) 2017/625 gan gynnwys ar iechyd a lles anifeiliaid.'
    )
  })

  it('Should say when responsibility starts and when it ends', () => {
    expect(copy.body.responsible).toBe(
      'I confirm I am responsible for this consignment.'
    )
    expect(copy.body.responsibleDetail).toBe(
      'I am responsible from the submission of this notification to when it enters Great Britain. And I am responsible until it has either:'
    )
    expect(copy.body.responsibleItems).toEqual([
      'cleared official checks at the border',
      'reached the Place of Destination as stated on the health certificate or notification'
    ])
    expect(copyCy.body.responsible).toBe(
      'Rwy’n cadarnhau mai fi sy’n gyfrifol am y llwyth hwn.'
    )
    expect(copyCy.body.responsibleDetail).toBe(
      'Rwy’n gyfrifol o adeg cyflwyno’r hysbysiad hwn hyd nes iddo ddod i mewn i Brydain Fawr. Ac rwy’n gyfrifol nes iddo naill ai:'
    )
    expect(copyCy.body.responsibleItems).toEqual([
      'glirio gwiriadau swyddogol wrth y ffin',
      'gyrraedd y man cyrchfan fel y nodir ar y dystysgrif iechyd neu’r hysbysiad'
    ])
  })

  it('Should spell out each thing the trader is accountable for', () => {
    expect(copy.body.accountableFor).toBe(
      'I confirm that I am accountable for:'
    )
    expect(copy.body.accountableItems).toEqual([
      'any payment for the official controls at the border',
      'any arrangements to re-dispatch the consignment',
      'any costs needed for quarantine or isolation of consignments',
      'any costs needed for destruction and disposal of consignments, when instructed by the authorities'
    ])
    expect(copyCy.body.accountableItems).toEqual([
      'unrhyw daliad am y rheolaethau swyddogol wrth y ffin',
      'unrhyw drefniadau i ail-anfon y llwyth',
      'unrhyw gostau sydd eu hangen ar gyfer cwarantin neu ynysu llwythi',
      'unrhyw gostau sydd eu hangen ar gyfer dinistrio a gwaredu llwythi, pan gyfarwyddir gan yr awdurdodau'
    ])
  })
})

describe('declaration reached from the review', () => {
  useStubbedJourney(SET_ID, dispatchPages)
  beforeEach(() => {
    configureReadyForCheckYourAnswers(SET_ID, () => true)
  })

  it('Should supply the feature copy module and the shared chrome copy', async () => {
    const result = await driveHandler(declarationRoutesFromReview[0].handler)
    expect(result.view.context.copy).toBe(copy)
    expect(result.view.context.pageTitle).toBe(copy.title)
    expect(result.view.context.sharedCopy.errorSummary.title).toBe(
      'There is a problem'
    )
  })
})
