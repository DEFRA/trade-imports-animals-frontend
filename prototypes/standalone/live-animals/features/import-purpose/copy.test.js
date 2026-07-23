import { beforeAll, beforeEach, describe, expect, test } from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { driveHandler } from '../../engine/test-support.js'
import * as importReasonPurpose from '../../services/import-reason-purpose/index.js'
import { dispatchPages } from '../index.js'

import * as importPurpose from './controller.js'
import { copy } from './copy.en.js'

const isPlainObject = (node) => typeof node === 'object' && node !== null

const leaves = (node, path = []) =>
  isPlainObject(node)
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, [...path, key])
      )
    : [{ path: path.join('.'), value: node }]

describe('#copy', () => {
  test('Should have a non-empty string at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      expect(typeof value, `${path} must be a string`).toBe('string')
      expect(value.trim().length, `${path} must not be empty`).toBeGreaterThan(
        0
      )
    }
  })

  test('Should carry a hint for every service purpose option', () => {
    for (const option of importReasonPurpose.purposes()) {
      expect(copy.purposeHints[option.value]).toBeTruthy()
    }
  })
})

describe('GET /import-purpose', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  test('Should supply the feature copy module and hint every option from it', async () => {
    const get = importPurpose.routes.find(
      (route) => route.method === 'GET'
    ).handler
    const result = await driveHandler(get)
    expect(result.view.context.copy).toBe(copy)
    expect(result.view.context.pageTitle).toBe(copy.title)
    for (const option of result.view.context.purposeOptions) {
      expect(option.hint.text).toBe(copy.purposeHints[option.value])
    }
  })
})
