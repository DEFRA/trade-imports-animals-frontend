import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import { driveHandler } from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'

import * as cphNumber from '../controller.js'
import { copy } from './copy.en.js'
import { copy as copyCy } from './copy.cy.js'

const leaves = (node, path = []) =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, [...path, key])
      )
    : [{ path: path.join('.'), value: node }]

describe('cph-number copy module', () => {
  it('Should have a non-empty string at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      expect(typeof value, `${path} must be a string`).toBe('string')
      expect(value.trim().length, `${path} must not be empty`).toBeGreaterThan(
        0
      )
    }
  })

  // Design release 1 heads the page with an instruction and gives the group of
  // boxes a short legend of its own, in both locales.
  // src/server/app/copy-parity.test.js only checks that cy differs from en, so
  // the Welsh wording needs pinning here.
  it('Should head the page with an instruction and name the group short', () => {
    expect(copy.title).toBe('Add the county parish holding number (CPH)')
    expect(copy.cph.legend).toBe('CPH number')
    expect(copyCy.title).toBe('Ychwanegu rhif daliad plwyf sirol (CPH)')
    expect(copyCy.cph.legend).toBe('Rhif CPH')
  })

  // The three boxes take the number in its real parts, so each carries a
  // label of its own. Design release 1 hides these labels with its own
  // stylesheet; the service keeps them on screen — pinned in
  // cph-number.fit.spec.js, which asserts the label elements are rendered.
  // This test pins the strings only.
  it('Should name each part of the number', () => {
    expect(copy.cph.county).toBe('County')
    expect(copy.cph.parish).toBe('Parish')
    expect(copy.cph.holding).toBe('Holding number')
    expect(copyCy.cph.county).toBe('Sir')
    expect(copyCy.cph.parish).toBe('Plwyf')
    expect(copyCy.cph.holding).toBe('Rhif daliad')
  })

  // A CPH number is two digits of county, three of parish and four of holding.
  // The example has to teach that grouping — the page used to offer 123/456/789,
  // a 3/3/3 shape no CPH number uses.
  it('Should give an example in the real 2/3/4 grouping', () => {
    expect(copy.cph.hint).toBe('For example, 12/345/6789.')
    expect(copyCy.cph.hint).toBe('Er enghraifft, 12/345/6789.')
  })

  // Design release 1 puts the help behind a "What is a CPH number?" expander:
  // a definition and where to find the number. The second paragraph names APHA
  // documents only — DR1's GOV.UK holding-details link is a placeholder href,
  // so there is no destination to ship yet and no link string to hold.
  it('Should explain what a CPH number is and where to find one', () => {
    expect(copy.help.summary).toBe('What is a CPH number?')
    expect(copy.help.definition).toBe(
      'A county parish holding (CPH) number is a unique 9-digit number used to identify land and buildings where livestock are kept, moved or handled.'
    )
    expect(copy.help.whereToFind).toBe(
      'You can find your CPH number on documents from the Animal and Plant Health Agency (APHA).'
    )
    expect(copyCy.help.summary).toBe('Beth yw rhif CPH?')
  })
})

describe('GET cph-number — copy reaches the view', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should supply the feature copy module and the shared chrome copy', async () => {
    const get = cphNumber.routes.find((route) => route.method === 'GET').handler
    const result = await driveHandler(get)
    expect(result.view.context.copy).toBe(copy)
    expect(result.view.context.pageTitle).toBe(copy.title)
    expect(result.view.context.sharedCopy.saveActions.saveAndContinue).toBe(
      'Save and continue'
    )
  })
})
