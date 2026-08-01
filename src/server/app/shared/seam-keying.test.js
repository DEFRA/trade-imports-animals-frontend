import Hapi from '@hapi/hapi'
import { describe, expect, it, vi } from 'vitest'

describe('per-set seam keying', () => {
  it('holds different values for two set ids in every seam', async () => {
    vi.resetModules()
    const context = await import('./set-context.js')
    const manifest = await import('../model/obligations/manifest.js')
    const fulfilments = await import('../bridge/fulfilment-registry.js')
    const journey = await import('../flow/journey-flow.js')
    const dispatch = await import('../flow/dispatch.js')
    const persistence = await import('../engine/persistence/records.js')
    const session = await import('../engine/persistence/session.js')
    const commodity =
      await import('../services/persistence/records/notification-mapper/commodity-reference.js')

    context.registerSetMount('a', '/a')
    context.registerSetMount('b', '/b')

    manifest.configureObligationSet('a', {
      marker: 'manifest-a',
      obligations: [],
      groups: []
    })
    manifest.configureObligationSet('b', {
      marker: 'manifest-b',
      obligations: [],
      groups: []
    })
    fulfilments.configureFulfilmentRegistry('a', [
      { name: 'feature-a', bindings: [] }
    ])
    fulfilments.configureFulfilmentRegistry('b', [
      { name: 'feature-b', bindings: [] }
    ])
    journey.configureJourneyFlow('a', { layout: 'layout-a' })
    journey.configureJourneyFlow('b', { layout: 'layout-b' })
    dispatch.buildDispatch('a', [{ id: 'page', slug: 'slug-a' }])
    dispatch.buildDispatch('b', [{ id: 'page', slug: 'slug-b' }])
    persistence.configureRecords('a', { load: () => 'records-a' })
    persistence.configureRecords('b', { load: () => 'records-b' })
    session.configureSession('a', {}, { knownJourneys: 'cookie-a' })
    session.configureSession('b', {}, { knownJourneys: 'cookie-b' })
    commodity.configureCommodityReference('a', {
      speciesLabel: () => 'commodity-a'
    })
    commodity.configureCommodityReference('b', {
      speciesLabel: () => 'commodity-b'
    })

    const seams = [
      {
        label: 'obligation set',
        read: () => manifest.obligationSet().marker,
        a: 'manifest-a',
        b: 'manifest-b'
      },
      {
        label: 'fulfilment registry',
        read: () => fulfilments.fulfilmentRegistry.features,
        a: [{ name: 'feature-a', bindings: [] }],
        b: [{ name: 'feature-b', bindings: [] }]
      },
      {
        label: 'journey flow',
        read: journey.journeyLayout,
        a: 'layout-a',
        b: 'layout-b'
      },
      {
        label: 'dispatch',
        read: () => dispatch.slugOfPage('page'),
        a: 'slug-a',
        b: 'slug-b'
      },
      {
        label: 'records',
        read: persistence.records.load,
        a: 'records-a',
        b: 'records-b'
      },
      {
        label: 'session',
        read: session.knownJourneysCookie,
        a: 'cookie-a',
        b: 'cookie-b'
      },
      {
        label: 'commodity reference',
        read: commodity.speciesLabel,
        a: 'commodity-a',
        b: 'commodity-b'
      }
    ]

    for (const seam of seams) {
      expect(context.withSetContext('a', seam.read), seam.label).toEqual(seam.a)
      expect(context.withSetContext('b', seam.read), seam.label).toEqual(seam.b)
      expect(seam.read, seam.label).toThrow('No set context')
    }

    vi.resetModules()
  })
})

describe('live-animals extension sandboxing', () => {
  it('does not run its set context or entry guard on another set route', async () => {
    vi.resetModules()
    const server = Hapi.server()
    const { liveAnimals } = await import('../routes.js')
    const context = await import('./set-context.js')
    const { configureJourneyFlow } = await import('../flow/journey-flow.js')
    const otherEntryGuard = vi.fn(() => null)
    let contextBeforeOtherExtension

    await server.register(liveAnimals)
    await server.register(
      {
        plugin: {
          name: 'other-set-probe',
          register: (realmServer) => {
            context.registerSetMount('other-set', '/other-set')
            configureJourneyFlow('other-set', {
              entryGuardTarget: otherEntryGuard
            })
            realmServer.ext(
              'onPreAuth',
              (_request, h) => {
                try {
                  contextBeforeOtherExtension = context.currentSetId()
                } catch {
                  contextBeforeOtherExtension = undefined
                }
                context.enterSetContext('other-set')
                return h.continue
              },
              { sandbox: 'plugin' }
            )
            realmServer.route({
              method: 'GET',
              path: '/notifications/{journeyId}/probe',
              handler: () => 'other-set'
            })
          }
        }
      },
      { routes: { prefix: '/other-set' } }
    )

    const response = await server.inject(
      '/other-set/notifications/journey-1/probe'
    )

    expect(response.statusCode).toBe(200)
    expect(response.result).toBe('other-set')
    expect(contextBeforeOtherExtension).toBeUndefined()
    expect(otherEntryGuard).not.toHaveBeenCalled()
    vi.resetModules()
  })
})
