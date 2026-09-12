import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import { driveHandler } from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'

import * as declaration from '../controller.js'
import { copy } from './copy.en.js'
import { copy as copyCy } from './copy.cy.js'

const leaves = (node, path = []) =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, [...path, key])
      )
    : [{ path: path.join('.'), value: node }]

describe('declaration copy module', () => {
  it('Should have a non-empty string at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      expect(typeof value, `${path} must be a string`).toBe('string')
      expect(value.trim().length, `${path} must not be empty`).toBeGreaterThan(
        0
      )
    }
  })

  // Design release 1 gives each declaration statement a heading and a body
  // (app/views/declaration.html:40-64). This is a legal statement the trader
  // affirms, so the wording is pinned rather than approximated.
  // declaration.fit.spec.js asserts the page against these same constants, and
  // src/server/app/copy-parity.test.js only checks that cy differs from en, so
  // both locales need pinning here.
  it('Should name the regulation the contact statement sits under', () => {
    expect(copy.body.contactUkDetail).toBe(
      'I am complying with the requirements of Regulation (EU) 2017/625 including on animal health and welfare.'
    )
    expect(copyCy.body.contactUkDetail).toBe(
      'Rwy’n cydymffurfio â gofynion Rheoliad (EU) 2017/625 gan gynnwys ar iechyd a lles anifeiliaid.'
    )
  })

  // The heading states the responsibility; the body states when it starts and
  // the two ways it ends. The page used to compress all three into one heading.
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
    // Both bullets complete the 'nes iddo naill ai:' lead-in above, so both
    // take the soft-mutated form: glirio (clirio), gyrraedd (cyrraedd).
    expect(copyCy.body.responsibleItems).toEqual([
      'glirio gwiriadau swyddogol wrth y ffin',
      'gyrraedd y man cyrchfan fel y nodir ar y dystysgrif iechyd neu’r hysbysiad'
    ])
  })

  // Each accountability item names what is owed and when, rather than the
  // compressed phrases the page carried before Design release 1.
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

describe('GET /declaration', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should supply the feature copy module and the shared chrome copy', async () => {
    const get = declaration.routes.find(
      (route) => route.method === 'GET'
    ).handler
    const result = await driveHandler(get)
    expect(result.view.context.copy).toBe(copy)
    expect(result.view.context.pageTitle).toBe(copy.title)
    expect(result.view.context.sharedCopy.errorSummary.title).toBe(
      'There is a problem'
    )
  })
})
