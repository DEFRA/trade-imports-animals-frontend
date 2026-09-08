import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import { driveHandler } from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'

import * as additionalDetails from '../controller.js'
import { copy } from './copy.en.js'
import { copy as copyCy } from './copy.cy.js'

const leaves = (node, path = []) =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, [...path, key])
      )
    : [{ path: path.join('.'), value: node }]

describe('additional-details copy module', () => {
  it('Should have a non-empty string at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      expect(typeof value, `${path} must be a string`).toBe('string')
      expect(value.trim().length, `${path} must not be empty`).toBeGreaterThan(
        0
      )
    }
  })

  it('Should name the page without the word animal', () => {
    expect(copy.title).toBe('Additional details')
    expect(copyCy.title).toBe('Manylion ychwanegol')
  })

  // A trader arrives holding several certificates, so "the health certificate"
  // does not say which one the certification purposes are copied off. The hint
  // names the document — the ITAHC — and the abbreviation is the same one the
  // documents and check-answers features already show unexpanded.
  it('Should name the ITAHC as the source of the certification purpose', () => {
    expect(copy.certified.hint).toBe(
      'This information can be found on the ITAHC.'
    )
    expect(copyCy.certified.hint).toContain('ITAHC')
  })
})

describe('GET additional-details — copy reaches the view', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should supply the feature copy module to the view', async () => {
    const get = additionalDetails.routes.find(
      (route) => route.method === 'GET'
    ).handler
    const result = await driveHandler(get)
    expect(result.view.context.copy).toBe(copy)
    expect(result.view.context.pageTitle).toBe(copy.title)
  })

  it('Should label the unweaned options from the copy module', async () => {
    const get = additionalDetails.routes.find(
      (route) => route.method === 'GET'
    ).handler
    const result = await driveHandler(get)
    expect(
      result.view.context.unweanedOptions.map((option) => option.text)
    ).toEqual([copy.unweaned.yes, copy.unweaned.no])
  })
})
