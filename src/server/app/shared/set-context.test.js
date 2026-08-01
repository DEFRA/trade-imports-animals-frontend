import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

let currentSetBase
let currentSetId
let enterSetContext
let mountedSetIds
let registerSetMount
let setKeyed
let withSetContext

beforeAll(async () => {
  vi.resetModules()
  ;({
    currentSetBase,
    currentSetId,
    enterSetContext,
    mountedSetIds,
    registerSetMount,
    setKeyed,
    withSetContext
  } = await import('./set-context.js'))
})

afterAll(() => vi.resetModules())

describe('set context', () => {
  it.each([undefined, '', 'x'])(
    'rejects the invalid mount prefix %s',
    (prefix) => {
      expect(() => registerSetMount('x', prefix)).toThrow(
        'Set "x" needs a mount prefix'
      )
    }
  )

  it('returns the sole registered set and its base without active context', () => {
    registerSetMount('sole', '/sole')

    expect(mountedSetIds()).toContain('sole')
    expect(currentSetId()).toBe('sole')
    expect(currentSetBase()).toBe('/sole')
  })

  it('throws without active context when two sets are mounted', () => {
    registerSetMount('second', '/second')

    expect(() => currentSetId()).toThrow('No set context')
  })

  it('scopes boot work and restores the previous context', () => {
    withSetContext('outer', () => {
      expect(currentSetId()).toBe('outer')
      withSetContext('inner', () => expect(currentSetId()).toBe('inner'))
      expect(currentSetId()).toBe('outer')
    })

    expect(() => currentSetId()).toThrow('No set context')
  })

  it('keeps two keyed values separate and names an unconfigured slot', () => {
    const store = setKeyed('example seam')
    store.configure('a', 'value-a')
    store.configure('b', 'value-b')

    expect(withSetContext('a', () => store.current())).toBe('value-a')
    expect(withSetContext('b', () => store.current())).toBe('value-b')
    expect(() => withSetContext('c', () => store.current())).toThrow(
      'example seam not configured for set "c"'
    )
  })

  it('keeps enterSetContext across an await', async () => {
    await withSetContext('before', async () => {
      enterSetContext('after')
      await Promise.resolve()
      expect(currentSetId()).toBe('after')
    })
  })

  it('keeps the right context across genuinely interleaved work', async () => {
    let releaseFirst
    const firstCanResume = new Promise((resolve) => {
      releaseFirst = resolve
    })
    const store = setKeyed('interleaved seam')
    store.configure('slow', 'slow-value')
    store.configure('fast', 'fast-value')

    const slow = (async () => {
      enterSetContext('slow')
      await firstCanResume
      return [currentSetId(), store.current()]
    })()

    const fast = (async () => {
      enterSetContext('fast')
      await Promise.resolve()
      releaseFirst()
      return [currentSetId(), store.current()]
    })()

    await expect(Promise.all([slow, fast])).resolves.toEqual([
      ['slow', 'slow-value'],
      ['fast', 'fast-value']
    ])
  })
})

describe('plugin-sandboxed set lifecycle extensions', () => {
  it('runs only the extension owned by the requested route set', async () => {
    const server = Hapi.server()
    const invoked = []
    const plugin = (setId) => ({
      plugin: {
        name: `probe-${setId}`,
        register: (realmServer) => {
          realmServer.ext(
            'onPreAuth',
            (_request, h) => {
              invoked.push(setId)
              return h.continue
            },
            { sandbox: 'plugin' }
          )
          realmServer.route({
            method: 'GET',
            path: '/',
            handler: () => setId
          })
        }
      }
    })

    await server.register(plugin('a'), { routes: { prefix: '/a' } })
    await server.register(plugin('b'), { routes: { prefix: '/b' } })

    expect((await server.inject('/a')).result).toBe('a')
    expect(invoked).toEqual(['a'])
  })

  it('keeps set context across genuinely interleaved requests', async () => {
    const server = Hapi.server()
    const store = setKeyed('request seam')
    store.configure('slow', 'slow-value')
    store.configure('fast', 'fast-value')
    let releaseSlow
    let markSlowStarted
    const slowCanResume = new Promise((resolve) => {
      releaseSlow = resolve
    })
    const slowStarted = new Promise((resolve) => {
      markSlowStarted = resolve
    })
    const plugin = (setId, handler) => ({
      plugin: {
        name: `interleaved-${setId}`,
        register: (realmServer) => {
          realmServer.ext(
            'onPreAuth',
            (_request, h) => {
              enterSetContext(setId)
              return h.continue
            },
            { sandbox: 'plugin' }
          )
          realmServer.route({ method: 'GET', path: '/', handler })
        }
      }
    })

    await server.register(
      plugin('slow', async () => {
        markSlowStarted()
        await slowCanResume
        return [currentSetId(), store.current()]
      }),
      { routes: { prefix: '/slow' } }
    )
    await server.register(
      plugin('fast', async () => {
        await slowStarted
        releaseSlow()
        return [currentSetId(), store.current()]
      }),
      { routes: { prefix: '/fast' } }
    )

    const [slow, fast] = await Promise.all([
      server.inject('/slow'),
      server.inject('/fast')
    ])

    expect(slow.result).toEqual(['slow', 'slow-value'])
    expect(fast.result).toEqual(['fast', 'fast-value'])
  })
})
