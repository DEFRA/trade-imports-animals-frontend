import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { driveHandler } from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'

import * as search from './search.controller.js'
import { copy } from './copy.en.js'

const leaves = (node, path = []) =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, [...path, key])
      )
    : [{ path: path.join('.'), value: node }]

describe('#copy', () => {
  // Parameterised strings are copy FUNCTIONS: a leaf may be a function of
  // sample arguments returning the finished sentence.
  it('Should have a non-empty string (or string-returning function) at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      const text =
        typeof value === 'function' ? value('sample', 2, 3, 4) : value
      expect(typeof text, `${path} must resolve to a string`).toBe('string')
      expect(text.trim().length, `${path} must not be empty`).toBeGreaterThan(0)
    }
  })

  it('Should interpolate selectedCount', () => {
    expect(copy.search.selectedCount(3)).toBe('3 selected')
  })

  it('Should interpolate countDrop', () => {
    expect(copy.consignmentDetails.errors.countDrop(3, 'Bos taurus', 2)).toBe(
      'You have 3 identifier records for Bos taurus but entered 2 animals. Remove identifier records or keep the higher count.'
    )
    expect(
      copy.consignmentDetails.errors.countDrop(1, 'Bos taurus', 1)
    ).toContain('1 identifier record for')
  })

  it('Should interpolate counter', () => {
    expect(copy.identification.counter('Bos taurus', 2, 2)).toBe(
      'Enter details for Bos taurus 2 of 2'
    )
  })

  it('Should interpolate overCount', () => {
    expect(copy.identification.overCount(1, 'Bos taurus', 2, 1)).toBe(
      'This commodity line lists 1 Bos taurus animals but you have entered details for 2. Remove 1 to continue.'
    )
  })

  it('Should interpolate capReached', () => {
    expect(copy.identification.errors.capReached(2)).toBe(
      'You have already entered details for all 2 animals — remove a record before adding another'
    )
  })
})

describe('GET commodities search — copy reaches the view', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should supply the page copy namespace and the shared chrome copy', async () => {
    const get = search.routes.find((route) => route.method === 'GET').handler
    const result = await driveHandler(get)
    expect(result.view.context.copy).toBe(copy.search)
    expect(result.view.context.pageTitle).toBe(copy.search.title)
    expect(result.view.context.sharedCopy.saveActions.saveAndContinue).toBe(
      'Save and continue'
    )
  })
})
