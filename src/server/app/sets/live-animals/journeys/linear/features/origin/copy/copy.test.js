import { SET_ID } from '../../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import { driveHandler } from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'

import * as origin from '../controller.js'
import { copy } from './copy.en.js'
import { copy as copyCy } from './copy.cy.js'

const leaves = (node, path = []) =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, [...path, key])
      )
    : [{ path: path.join('.'), value: node }]

describe('#copy', () => {
  it('Should have a non-empty string at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      expect(typeof value, `${path} must be a string`).toBe('string')
      expect(value.trim().length, `${path} must not be empty`).toBeGreaterThan(
        0
      )
    }
  })

  it('Should ask the country of origin without a hint', () => {
    expect(copy.country.hint).toBeUndefined()
    expect(copyCy.country.hint).toBeUndefined()
  })

  it("Should invite a search in the empty box and keep the select's blank option", () => {
    expect(copy.country.searchPlaceholder).toBe('Search for a country')
    expect(copyCy.country.searchPlaceholder).toBe('Chwiliwch am wlad')
    expect(copy.country.placeholder).toBe('Select a country')
    expect(copyCy.country.placeholder).toBe('Dewiswch wlad')
  })

  it('Should leave the internal reference length limit to the error, not the hint', () => {
    expect(copy.internalReference.hint).toBe(
      'Enter any internal reference you want to use to identify this consignment, or leave blank.'
    )
    expect(copyCy.internalReference.hint).toBe(
      'Rhowch unrhyw gyfeirnod mewnol yr hoffech ei ddefnyddio i adnabod y llwyth hwn, neu gadewch yn wag.'
    )
    expect(copy.internalReference.hint).not.toContain('58')
    expect(copyCy.internalReference.hint).not.toContain('58')
    expect(copy.errors.internalReferenceMaxLength).toContain('58')
    expect(copyCy.errors.internalReferenceMaxLength).toContain('58')
  })

  it("Should point to the health certificate in the region of origin code question's hint", () => {
    expect(copy.regionRequirement.hint).toBe(
      'Check the health certificate for a region of origin code. You can add the code later if you do not have the certificate now.'
    )
    expect(copyCy.regionRequirement.hint).toBe(
      'Gwiriwch y dystysgrif iechyd am god rhanbarth tarddiad. Gallwch ychwanegu’r cod yn nes ymlaen os nad yw’r dystysgrif gennych nawr.'
    )
    expect(copy.regionCode.hint).toBe('Enter up to 5 characters.')
  })
})

describe('GET /origin', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should supply the feature copy module and the shared chrome copy', async () => {
    const get = origin.routes.find((route) => route.method === 'GET').handler
    const result = await driveHandler(get)
    expect(result.view.context.copy).toBe(copy)
    expect(result.view.context.pageTitle).toBe(copy.title)
    expect(result.view.context.sharedCopy.saveActions.saveAndContinue).toBe(
      'Save and continue'
    )
    expect(result.view.context.countryItems[0].text).toBe(
      copy.country.placeholder
    )
  })
})
