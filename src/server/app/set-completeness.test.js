import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Hapi from '@hapi/hapi'
import { describe, expect, it } from 'vitest'

import { assertSetConfigured } from './set-completeness.js'
import { feature, scalar } from './bridge/fulfilment-bindings.js'
import { configureFulfilmentRegistry } from './bridge/fulfilment-registry.js'
import { configureReadyForCheckYourAnswers } from './bridge/readiness-config.js'
import { buildDispatch } from './flow/dispatch.js'
import { configureJourneyFlow } from './flow/journey-flow.js'
import { configureObligationSet } from './model/obligations/manifest.js'
import { configureRecords } from './engine/persistence/records.js'
import { configureSession } from './engine/persistence/session.js'
import { registerJourneyCookie } from './engine/journey.js'
import {
  mountedSetIds,
  registerSetMount,
  requiredSeamLabels,
  unconfiguredSeamsOf,
  withSetContext
} from './shared/set-context.js'
import { session as sessionStub } from './services/persistence/session/stub.js'
import {
  dispatchPages,
  groups,
  obligations,
  records as recordsStub,
  shipmentReference
} from '../../../test/fixtures/second-set.js'

const APP_DIR = path.dirname(fileURLToPath(import.meta.url))

const REQUIRED_SEAMS = [
  'Obligation set',
  'Fulfilment registry',
  'journey flow',
  'Ready-for-check-your-answers',
  'dispatch',
  'records',
  'session'
]

const OMITTABLE_SEAMS = REQUIRED_SEAMS.filter(
  (label) => label !== 'Obligation set' && label !== 'session'
)

const cookieNamesFor = (setId) => ({
  knownJourneys: `${setId}-known`,
  openingRun: `${setId}-run`,
  flowOnlyAnswers: `${setId}-flow`,
  addressHandshakeTokens: `${setId}-tokens`,
  addedAddressBanner: `${setId}-banner`,
  reviewedConcurrencyTokens: `${setId}-reviewed`
})

const journeyFlowFor = () => ({
  sections: [{ id: 'details', pages: [{ id: 'details', slug: 'details' }] }],
  taskRows: [],
  rowStatus: () => 'notStarted',
  nextRunTarget: () => null,
  previousRunTarget: () => null,
  flowOnlyKeys: [],
  entryGuardTarget: async () => null,
  layout: 'shared/layout.njk'
})

const seamInstallers = {
  'Obligation set': (setId) =>
    configureObligationSet(setId, { obligations, groups }),
  'Fulfilment registry': (setId) =>
    configureFulfilmentRegistry(setId, [
      feature('probe-details', [
        scalar({ field: shipmentReference.name, obligation: shipmentReference })
      ])
    ]),
  'journey flow': (setId) => configureJourneyFlow(setId, journeyFlowFor()),
  'Ready-for-check-your-answers': (setId) =>
    configureReadyForCheckYourAnswers(setId, () => true),
  dispatch: (setId) => buildDispatch(setId, dispatchPages),
  records: (setId) => configureRecords(setId, recordsStub),
  session: (setId) =>
    configureSession(setId, sessionStub, cookieNamesFor(setId))
}

const installSeams = (setId, omitted) => {
  for (const label of REQUIRED_SEAMS) {
    if (label !== omitted) {
      seamInstallers[label](setId)
    }
  }
}

const probeGateway = (
  setId,
  { omit, seams = true, cookies = true, cookiesFirst = false } = {}
) => ({
  plugin: {
    name: setId,
    register: async (server) => {
      registerSetMount(setId, `/${setId}`)
      await withSetContext(setId, async () => {
        if (cookies && cookiesFirst) {
          registerJourneyCookie(server)
        }
        if (seams) {
          installSeams(setId, omit)
        }
        if (cookies && !cookiesFirst) {
          registerJourneyCookie(server)
        }
        assertSetConfigured(server, setId)
      })
    }
  }
})

const mount = (plugin) => Hapi.server().register(plugin)

describe('set completeness — a set that forgets a seam refuses to mount', () => {
  it.each(OMITTABLE_SEAMS)(
    'Should refuse to mount a set that never configured the %s seam',
    async (label) => {
      const setId = `probe-no-${label.replaceAll(' ', '-')}`

      await expect(mount(probeGateway(setId, { omit: label }))).rejects.toThrow(
        new RegExp(`Set "${setId}" mounted without configuring: .*${label}`)
      )
    }
  )

  it('Should refuse to mount a set that never configured the session seam', async () => {
    const setId = 'probe-no-session'

    await expect(
      mount(probeGateway(setId, { omit: 'session', cookies: false }))
    ).rejects.toThrow(
      `Set "${setId}" mounted without configuring: session (configureSession)`
    )
  })

  it('Should name every seam when a set configured none of them', async () => {
    const setId = 'probe-no-seams'
    const registration = mount(
      probeGateway(setId, { seams: false, cookies: false })
    )

    await expect(registration).rejects.toThrow(
      `Set "${setId}" mounted without configuring:`
    )
    for (const label of REQUIRED_SEAMS) {
      await expect(registration).rejects.toThrow(label)
    }
  })

  it('Should name the call that would have configured the missing seam', () => {
    expect(unconfiguredSeamsOf('probe-never-configured')).toEqual(
      expect.arrayContaining([
        'journey flow (configureJourneyFlow)',
        'session (configureSession)',
        'records (configureRecords)',
        'dispatch (buildDispatch)',
        'Obligation set (configureObligationSet)',
        'Fulfilment registry (configureFulfilmentRegistry)',
        'Ready-for-check-your-answers (configureReadyForCheckYourAnswers)'
      ])
    )
  })
})

describe('set completeness — a fully configured set mounts', () => {
  it('Should mount a set that configured every seam', async () => {
    await mount(probeGateway('probe-complete'))

    expect(mountedSetIds()).toContain('probe-complete')
  })
})

describe('set completeness — journey cookies come after the session seam', () => {
  it('Should refuse a set that never registered its journey cookies', async () => {
    const setId = 'probe-no-cookies'

    await expect(
      mount(probeGateway(setId, { cookies: false }))
    ).rejects.toThrow(
      `Set "${setId}" mounted without its journey cookies: ${setId}-known`
    )
  })

  it('Should register every journey cookie the set is configured with', async () => {
    const setId = 'probe-six-cookies'
    const server = Hapi.server()

    await server.register(probeGateway(setId))

    expect(Object.keys(server.states.cookies).toSorted()).toEqual(
      Object.values(cookieNamesFor(setId)).toSorted()
    )
  })

  it('Should refuse a set that registered every journey cookie but the added address banner', async () => {
    const setId = 'probe-no-banner-cookie'
    const names = cookieNamesFor(setId)
    const gateway = {
      plugin: {
        name: setId,
        register: async (server) => {
          registerSetMount(setId, `/${setId}`)
          await withSetContext(setId, async () => {
            installSeams(setId)
            for (const name of Object.values(names)) {
              if (name !== names.addedAddressBanner) {
                server.state(name, {})
              }
            }
            assertSetConfigured(server, setId)
          })
        }
      }
    }

    await expect(mount(gateway)).rejects.toThrow(
      `Set "${setId}" mounted without its journey cookies: ${names.addedAddressBanner} —`
    )
  })

  it('Should refuse a set that registered its journey cookies first', async () => {
    const setId = 'probe-cookies-first'

    await expect(
      mount(probeGateway(setId, { cookiesFirst: true }))
    ).rejects.toThrow(
      `Session not configured for set "${setId}" — call configureSession before registerJourneyCookie`
    )
  })
})

describe('set completeness — the seam list is the one the seams declare', () => {
  it('Should require exactly the seams with no safe default', () => {
    expect(requiredSeamLabels().toSorted()).toEqual(REQUIRED_SEAMS.toSorted())
  })

  it.each([
    ['routes-live-animals.js', path.join(APP_DIR, 'routes-live-animals.js')],
    [
      'the second-set fixture',
      path.resolve(APP_DIR, '../../../test/fixtures/second-set.js')
    ]
  ])('Should have %s call the gate', (_label, file) => {
    expect(readFileSync(file, 'utf8')).toContain(
      'assertSetConfigured(server, SET_ID)'
    )
  })
})
