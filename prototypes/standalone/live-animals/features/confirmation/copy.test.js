import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { journeyRequest, stubH } from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'

import * as confirmation from './controller.js'
import { copy } from './copy.en.js'

const leaves = (node, path = []) =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, [...path, key])
      )
    : [{ path: path.join('.'), value: node }]

describe('confirmation copy module', () => {
  it('Should have a non-empty string at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      expect(typeof value, `${path} must be a string`).toBe('string')
      expect(value.trim().length, `${path} must not be empty`).toBeGreaterThan(
        0
      )
    }
  })
})

describe('GET /confirmation', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should supply the feature copy module for a submitted notification', async () => {
    const { journeyId } = await store.create()
    await store.submit(journeyId)
    const get = confirmation.routes.find(
      (route) => route.method === 'GET'
    ).handler
    const h = stubH()

    await get(journeyRequest(journeyId), h)

    expect(h.captured.view.context.copy).toBe(copy)
    expect(h.captured.view.context.pageTitle).toBe(copy.title)
  })
})
