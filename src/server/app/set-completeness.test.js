/**
 * Boot-time completeness: a set that forgets a seam must not mount.
 *
 * Each seam still has its UNCONFIGURED fallback, untouched — this suite proves
 * the fallbacks can no longer be reached from a mounted set, because the mount
 * itself fails first. The two that matter most answer benignly rather than
 * throwing (`flow/journey-flow.js` returns no sections and no task rows,
 * `engine/persistence/session.js` returns the shared default cookie names), so
 * before this gate a forgotten seam showed up as an empty dashboard.
 *
 * The probes below are minimal gateways built here rather than in
 * `test/fixtures/second-set.js`: that fixture is a correctly wired set by
 * design, and these need to be wrong in one specific way each.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Hapi from '@hapi/hapi'
import { describe, expect, it } from 'vitest'

import { assertSetConfigured } from './set-completeness.js'
import { feature, scalar } from './bridge/fulfilment-bindings.js'
import { configureFulfilmentRegistry } from './bridge/fulfilment-registry.js'
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

/** Every seam a mounted set is required to fill, and the call that fills it. */
const REQUIRED_SEAMS = [
  'Obligation set',
  'Fulfilment registry',
  'journey flow',
  'dispatch',
  'records',
  'session'
]

/**
 * The obligation set has to be configured before the fulfilment registry and
 * the dispatch index, because both validate themselves against it as they are
 * built. Leaving it out is therefore covered by the "configures nothing" probe
 * rather than by omitting it from an otherwise complete install.
 */
const OMITTABLE_SEAMS = REQUIRED_SEAMS.filter(
  (label) => label !== 'Obligation set'
)

const cookieNamesFor = (setId) => ({
  knownJourneys: `${setId}-known`,
  openingRun: `${setId}-run`,
  flowOnlyAnswers: `${setId}-flow`,
  addressHandshakeTokens: `${setId}-tokens`
})

const journeyFlowFor = () => ({
  sections: [{ id: 'details', pages: [{ id: 'details', slug: 'details' }] }],
  taskRows: [],
  rowStatus: () => 'notStarted',
  nextRunTarget: () => null,
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

/**
 * A gateway shaped like the shipped one: mount, seams, journey cookies, and the
 * completeness gate as its last act.
 *
 * @param {string} setId - the probe's set id, unique per test so the shared
 * mount registry never sees the same set twice.
 * @param {object} [options] - what to get wrong.
 * @param {string} [options.omit] - a seam to leave unconfigured.
 * @param {boolean} [options.seams] - false to configure no seam at all.
 * @param {boolean} [options.cookiesFirst] - true to register the journey
 * cookies before the session seam, which is the ordering the gate rejects.
 * @returns {object} a Hapi plugin.
 */
const probeGateway = (
  setId,
  { omit, seams = true, cookiesFirst = false } = {}
) => ({
  plugin: {
    name: setId,
    register: async (server) => {
      registerSetMount(setId, `/${setId}`)
      await withSetContext(setId, async () => {
        if (cookiesFirst) {
          registerJourneyCookie(server, { base: `/${setId}` })
        }
        if (seams) {
          installSeams(setId, omit)
        }
        if (!cookiesFirst) {
          registerJourneyCookie(server, { base: `/${setId}` })
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

  it('Should name every seam when a set configured none of them', async () => {
    const setId = 'probe-no-seams'
    const registration = mount(probeGateway(setId, { seams: false }))

    // The obligation set can only be missed this way: the fulfilment registry
    // and the dispatch index both validate against it as they are built, so an
    // otherwise complete install cannot leave it out.
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
        'Fulfilment registry (configureFulfilmentRegistry)'
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
  it('Should refuse a set that registered its journey cookies first', async () => {
    const setId = 'probe-cookies-first'

    // registerJourneyCookie reads the names off the session seam, so running it
    // first silently registers the shared defaults. The set then reads cookies
    // nobody set — invisible until a user loses their draft.
    await expect(
      mount(probeGateway(setId, { cookiesFirst: true }))
    ).rejects.toThrow(
      `Set "${setId}" mounted without its journey cookies: ${setId}-known`
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
    // Source-level: a gateway that stopped calling the gate would still mount
    // cleanly today and only fail once a set forgot a seam.
    expect(readFileSync(file, 'utf8')).toContain(
      'assertSetConfigured(server, SET_ID)'
    )
  })
})
