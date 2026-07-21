import { beforeAll, beforeEach, describe, expect, test } from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { readyForCheckYourAnswers } from '../../flow/section-status.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from '../../engine/read.js'
import { driveHandler } from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'

import * as portOfEntry from './port-of-entry.controller.js'
import { copy } from './copy.en.js'

const leaves = (node, path = []) =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, [...path, key])
      )
    : [{ path: path.join('.'), value: node }]

describe('transport copy module', () => {
  // Parameterised strings are copy FUNCTIONS: a leaf may be a function of
  // sample arguments returning the finished sentence.
  test('Should have a non-empty string (or string-returning function) at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      const text =
        typeof value === 'function' ? value('sample', 'sample') : value
      expect(typeof text, `${path} must resolve to a string`).toBe('string')
      expect(text.trim().length, `${path} must not be empty`).toBeGreaterThan(0)
    }
  })

  test('Should interpolate transitCountries.errors.maxCountries', () => {
    expect(copy.transitCountries.errors.maxCountries(12)).toBe(
      'Select up to 12 countries'
    )
  })

  test('Should interpolate transportersSelect.optionHint', () => {
    expect(
      copy.transportersSelect.optionHint('1 Farm Lane, Kent', 'GB-01')
    ).toBe('1 Farm Lane, Kent — approval number GB-01')
  })
})

describe('GET /port-of-entry', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  test('Should supply the page copy namespace and the shared chrome copy', async () => {
    const get = portOfEntry.routes.find(
      (route) => route.method === 'GET'
    ).handler
    const result = await driveHandler(get)
    expect(result.view.context.copy).toBe(copy.portOfEntry)
    expect(result.view.context.pageTitle).toBe(copy.portOfEntry.title)
    expect(result.view.context.sharedCopy.saveActions.saveAndContinue).toBe(
      'Save and continue'
    )
    expect(result.view.context.portItems[0].text).toBe(
      copy.portOfEntry.port.placeholder
    )
    expect(result.view.context.arrivalDate.fieldset.legend.text).toBe(
      copy.portOfEntry.arrivalDate.label
    )
  })
})
