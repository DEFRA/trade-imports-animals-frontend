/**
 * Boot-time completeness: a set that forgets a seam must not mount.
 *
 * Each seam still has its UNCONFIGURED fallback, untouched — this suite proves
 * the fallbacks can no longer be reached from a mounted set, because the mount
 * itself fails first. The three that matter most answer benignly rather than
 * throwing (`flow/journey-flow.js` returns no sections and no task rows,
 * `engine/persistence/session.js` returns the shared default cookie names, and
 * `bridge/readiness-config.js` answers false forever), so before this gate a
 * forgotten seam showed up as an empty dashboard or a jammed submit gate.
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

/** Every seam a mounted set is required to fill, and the call that fills it. */
const REQUIRED_SEAMS = [
  'Obligation set',
  'Fulfilment registry',
  'journey flow',
  'Ready-for-check-your-answers',
  'dispatch',
  'records',
  'session'
]

/**
 * The seams an otherwise complete install can leave out one at a time.
 *
 * `Obligation set` cannot: the fulfilment registry and the dispatch index both
 * validate themselves against it as they are built, so omitting it fails
 * earlier than the gate. `session` cannot either: `registerJourneyCookie`
 * refuses at its own point of use, which is covered on its own below. Both are
 * still covered by the "configures nothing" probe.
 */
const OMITTABLE_SEAMS = REQUIRED_SEAMS.filter(
  (label) => label !== 'Obligation set' && label !== 'session'
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

/**
 * A gateway shaped like the shipped one: mount, seams, journey cookies, and the
 * completeness gate as its last act.
 *
 * @param {string} setId - the probe's set id, unique per test so the shared
 * mount registry never sees the same set twice.
 * @param {object} [options] - what to get wrong.
 * @param {string} [options.omit] - a seam to leave unconfigured.
 * @param {boolean} [options.seams] - false to configure no seam at all.
 * @param {boolean} [options.cookies] - false to skip registering the journey
 * cookies, which is what a gateway that forgot the call looks like.
 * @param {boolean} [options.cookiesFirst] - true to register the journey
 * cookies before the session seam, which is the ordering the gate rejects.
 * @returns {object} a Hapi plugin.
 */
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

    // Cookies skipped too: `registerJourneyCookie` refuses an unconfigured
    // session at its own point of use, so the gate would never be reached.
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

    // Every seam configured, so the seam check passes and the cookie-name
    // comparison is the only thing left to catch it. The point-of-use guard
    // cannot: a call that never happens cannot refuse. Nothing else would
    // either — the set reads cookies the server never registered, and loses
    // drafts at request time.
    await expect(
      mount(probeGateway(setId, { cookies: false }))
    ).rejects.toThrow(
      `Set "${setId}" mounted without its journey cookies: ${setId}-known`
    )
  })

  it('Should refuse a set that registered its journey cookies first', async () => {
    const setId = 'probe-cookies-first'

    // registerJourneyCookie reads the names off the session seam, so running it
    // first would silently register the shared defaults. It refuses at the
    // point of use rather than waiting for the gate — the cookie-name
    // comparison in set-completeness.js is the backstop for a gateway that
    // skipped the call altogether, covered above.
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
    // Source-level: a gateway that stopped calling the gate would still mount
    // cleanly today and only fail once a set forgot a seam.
    expect(readFileSync(file, 'utf8')).toContain(
      'assertSetConfigured(server, SET_ID)'
    )
  })
})
