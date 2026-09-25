/**
 * The route wrapper, with two sets mounted.
 *
 * With one set mounted `currentSetId()` falls back to the sole set, so every
 * one of these assertions would pass on an unwrapped route. Mounting a second
 * set is what makes the wrapping load-bearing.
 */
import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  currentSetBase,
  currentSetId,
  registerSetMount,
  routeWithSetContext,
  setIdForPath,
  withSetContext
} from './set-context.js'
import { SET_BASE, SET_ID } from '../sets/live-animals/set.js'

const OTHER_SET = 'wrapped-routes-probe'
const OTHER_BASE = `/${OTHER_SET}`

let server

const answerWithSetId = () => ({ setId: currentSetId() })

beforeAll(async () => {
  registerSetMount(OTHER_SET, OTHER_BASE)
  server = Hapi.server()
  server.route([
    routeWithSetContext(OTHER_SET, {
      method: 'GET',
      path: `${OTHER_BASE}/options-handler`,
      options: { handler: answerWithSetId }
    }),
    routeWithSetContext(OTHER_SET, {
      method: 'GET',
      path: `${OTHER_BASE}/options-pre`,
      options: {
        pre: [{ assign: 'seen', method: () => currentSetId() }],
        handler: (request) => ({ setId: request.pre.seen })
      }
    }),
    routeWithSetContext(OTHER_SET, {
      method: 'GET',
      path: `${OTHER_BASE}/route-handler`,
      handler: answerWithSetId
    })
  ])
  await server.initialize()
})

afterAll(async () => {
  await server.stop({ timeout: 0 })
})

describe('#routeWithSetContext', () => {
  it.each([
    ['options.handler', 'options-handler'],
    ['options.pre', 'options-pre'],
    ['route.handler', 'route-handler']
  ])(
    'Should run a route declared with %s inside its own set',
    async (_shape, slug) => {
      const response = await server.inject(`${OTHER_BASE}/${slug}`)

      expect(response.statusCode).toBe(200)
      expect(response.result.setId).toBe(OTHER_SET)
    }
  )
})

describe('#currentSetBase', () => {
  it('Should give the active set the mount it registered', () => {
    expect(withSetContext(OTHER_SET, currentSetBase)).toBe(OTHER_BASE)
    expect(withSetContext(SET_ID, currentSetBase)).toBe(SET_BASE)
  })

  it('Should refuse an active set with no registered mount', () => {
    // Answering `''` here would read as a root-mounted set, and every link the
    // set builds would point at the root instead of at the set.
    expect(() => withSetContext('never-mounted', currentSetBase)).toThrow(
      'Set "never-mounted" has no registered mount'
    )
  })
})

describe('#setIdForPath', () => {
  it('Should answer the set whose mount the path falls under', () => {
    expect(setIdForPath(`${SET_BASE}/notifications/GBN-AG-26-X`)).toBe(SET_ID)
    expect(setIdForPath(SET_BASE)).toBe(SET_ID)
    expect(setIdForPath(`${OTHER_BASE}/route-handler`)).toBe(OTHER_SET)
  })

  it('Should answer nothing for a path outside every mount', () => {
    expect(setIdForPath('/health')).toBeUndefined()
    expect(setIdForPath('/auth/sign-out')).toBeUndefined()
    expect(setIdForPath('/no-such-page')).toBeUndefined()
  })

  it('Should not treat a longer sibling name as being under the mount', () => {
    expect(setIdForPath(`${SET_BASE}-archive/notifications`)).toBeUndefined()
  })

  it('Should answer nothing when there is no path to read', () => {
    expect(setIdForPath(undefined)).toBeUndefined()
  })
})
