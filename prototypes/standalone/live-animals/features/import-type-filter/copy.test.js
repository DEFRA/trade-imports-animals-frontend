import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

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

import * as importTypeFilter from './controller.js'
import { copy } from './copy.en.js'

const leaves = (node, path = []) =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, [...path, key])
      )
    : [{ path: path.join('.'), value: node }]

describe('import-type-filter copy module', () => {
  it('Should have a non-empty string at every leaf', () => {
    leaves(copy).forEach(({ path, value }) => {
      expect(typeof value, `${path} must be a string`).toBe('string')
      expect(value.trim().length, `${path} must not be empty`).toBeGreaterThan(
        0
      )
    })
  })
})

describe('GET import-type-filter — copy reaches the view', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it('Should supply the feature copy module and label every option from it', async () => {
    const get = importTypeFilter.routes.find(
      (route) => route.method === 'GET'
    ).handler
    const result = await driveHandler(get)
    expect(result.view.context.copy).toBe(copy)
    expect(result.view.context.pageTitle).toBe(copy.title)
    for (const option of result.view.context.importTypeOptions) {
      expect(option.text).toBe(copy.importTypes[option.value])
    }
  })

  it('Should supply the copy module to the not-available holding page', async () => {
    const getNotAvailable = importTypeFilter.routes.find((route) =>
      route.path.endsWith('not-available')
    ).handler
    const result = await driveHandler(getNotAvailable)
    expect(result.view.context.copy).toBe(copy)
    expect(result.view.context.pageTitle).toBe(copy.notAvailable.title)
  })
})
