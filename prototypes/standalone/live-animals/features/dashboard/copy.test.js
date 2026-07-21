import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { configureRecords, records } from '../../engine/persistence/records.js'
import {
  configureSession,
  KNOWN_JOURNEYS_COOKIE
} from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'

import { routes } from './controller.js'
import { copy } from './copy.en.js'

const leaves = (node, path = []) =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, [...path, key])
      )
    : [{ path: path.join('.'), value: node }]

describe('dashboard copy module', () => {
  it('Should have a non-empty string (or string-returning function) at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      const text = typeof value === 'function' ? value('sample') : value
      expect(typeof text, `${path} must resolve to a string`).toBe('string')
      expect(text.trim().length, `${path} must not be empty`).toBeGreaterThan(0)
    }
  })

  it('Should interpolate the hidden action label', () => {
    expect(copy.actionHidden('GBN-1')).toBe('notification GBN-1')
  })
})

describe('GET dashboard — copy reaches the view', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
  })
  beforeEach(() => records.clear())

  it('Should supply the feature copy module and the shared chrome copy', async () => {
    const listGet = routes.find(
      (route) => route.method === 'GET' && route.path.endsWith('/home')
    ).handler
    const h = {
      view: (template, context) => ({ template, context })
    }
    const { context } = await listGet(
      {
        payload: {},
        params: {},
        query: {},
        state: { [KNOWN_JOURNEYS_COOKIE]: [] },
        headers: {},
        app: {}
      },
      h
    )
    expect(context.copy).toBe(copy)
    expect(context.pageTitle).toBe(copy.title)
    expect(context.sharedCopy.journeyStrip.draft).toBe('Draft')
  })
})
