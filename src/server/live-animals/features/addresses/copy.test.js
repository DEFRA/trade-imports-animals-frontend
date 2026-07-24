import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { driveHandler } from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'

import * as addresses from './controller.js'
import { PARTIES } from './parties.js'
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
        typeof value === 'function' ? value('sample', 'sample') : value
      expect(typeof text, `${path} must resolve to a string`).toBe('string')
      expect(text.trim().length, `${path} must not be empty`).toBeGreaterThan(0)
    }
  })

  it('Should interpolate the results caption', () => {
    expect(copy.picker.resultsCaption(5, 40)).toBe('Showing 5 of 40 addresses')
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
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

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
