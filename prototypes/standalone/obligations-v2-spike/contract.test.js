import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from './flow/dispatch.js'
import { registry } from './registry.js'
import { JOURNEY_COOKIE } from './engine/journey.js'
import { store } from './engine/store.js'
import { isAnswered } from './engine/util.js'
import { dispatchPages } from './features/index.js'

import * as email from './features/email/controller.js'
import * as aboutYou from './features/about-you/controller.js'
import * as vehicle from './features/your-vehicle/controller.js'
import * as driving from './features/driving-history/controller.js'
import * as claimsList from './features/claims/list.controller.js'
import * as claimsEntry from './features/claims/entry.controller.js'
import * as cover from './features/cover-type/controller.js'
import * as extras from './features/optional-extras/controller.js'
import * as addons from './features/addons/controller.js'
import * as ndWho from './features/named-driver/who.controller.js'
import * as ndRel from './features/named-driver/relationship.controller.js'
import * as modDesc from './features/modifications/describe.controller.js'
import * as modVal from './features/modifications/value.controller.js'
import * as ncd from './features/protected-ncd/years.controller.js'

/**
 * CONTRACT TEST (DISCUSSION-LOG entry 4a) — the safety net for the feature-model
 * restructure. It pins the controller<->model binding the boot assertion cannot
 * see: the boot coverage assertion only checks that each obligation is DECLARED
 * (`collects`) by exactly one page; it never checks a handler HONOURS that
 * declaration. This does.
 *
 *   The set of obligation ids a controller actually COMMITS must equal its
 *   declared `collects`, minus `renderOnly` (vehiclePhoto) and `system` (premium).
 *
 * Controllers are plain functions, so this is checkable headlessly: build a
 * synthetic (valid) payload, invoke the page's real POST handler against a stub
 * request/h backed by the real store, then diff the obligation ids the handler
 * newly wrote against `meta.collects`. Written outside `collects`, or a declared
 * id never written, both fail — the drift becomes a red test, not a silent hole.
 *
 * Gated obligations must be kept in scope by a `seed` (a pre-existing answer
 * that activates them), else `reconcile` would wipe the fresh write on commit —
 * which is itself the invalidation invariant, exercised separately.
 */

const stubH = () => ({
  view: (view, ctx) => ({ view, ctx }),
  redirect: (to) => ({ redirect: to }),
  state: () => {}
})

/** Drive one real handler against the store and return the resulting answers. */
const drive = (handler, { payload = {}, seed = {} } = {}) => {
  const journey = store.create()
  store.saveAnswers(journey.journeyId, seed)
  const request = {
    payload,
    params: {},
    query: {},
    state: { [JOURNEY_COOKIE]: journey.journeyId }
  }
  handler(request, stubH())
  return { before: seed, after: store.get(journey.journeyId).answers }
}

const postHandlerOf = (mod) =>
  mod.routes.find((route) => route.method === 'POST').handler

/** Obligation ids this handler NEWLY answered (across the whole model). */
const committedIds = ({ before, after }) =>
  registry.all
    .map((o) => o.id)
    .filter((id) => isAnswered(after[id]) && !isAnswered(before[id]))

/** `collects` minus the ids that are never committed by contract. */
const committableCollects = (collects) =>
  collects.filter((id) => {
    const o = registry.byId(id)
    return !o.renderOnly && !o.system
  })

// One case per collecting page. Payloads are VALID (an invalid payload re-renders
// and never commits), and every non-render/non-system collected id is filled so
// the "declared but never written" direction is genuinely exercised.
const cases = [
  {
    id: 'email',
    collects: email.meta.collects,
    handler: postHandlerOf(email),
    payload: { email: 'alex@example.com' }
  },
  {
    id: 'about-you',
    collects: aboutYou.meta.collects,
    handler: postHandlerOf(aboutYou),
    payload: {
      fullName: 'Alex Driver',
      preferredName: 'Al',
      phone: '01632 960001',
      postcode: 'SW1A 1AA',
      country: 'england',
      'dateOfBirth-day': '4',
      'dateOfBirth-month': '9',
      'dateOfBirth-year': '1990'
    }
  },
  {
    id: 'your-vehicle',
    collects: vehicle.meta.collects, // includes vehiclePhoto (renderOnly)
    handler: postHandlerOf(vehicle),
    payload: {
      registration: 'AB12 CDE',
      make: 'Ford',
      model: 'Focus',
      year: '2015',
      estimatedValue: '9000',
      vehiclePhoto: 'photo.jpg' // must NOT be committed
    }
  },
  {
    id: 'driving-history',
    collects: driving.meta.collects,
    handler: postHandlerOf(driving),
    payload: { yearsNoClaims: '3', hadClaims: 'yes', penaltyPoints: '0' }
  },
  {
    id: 'cover-type',
    collects: cover.meta.collects,
    handler: postHandlerOf(cover),
    payload: {
      coverType: 'comprehensive',
      voluntaryExcess: 'yes', // keeps excessAmount in scope on the same commit
      excessAmount: '250'
    }
  },
  {
    id: 'optional-extras',
    collects: extras.meta.collects,
    handler: postHandlerOf(extras),
    payload: { extras: ['breakdown', 'legal'] }
  },
  {
    id: 'addons',
    collects: addons.meta.collects,
    handler: postHandlerOf(addons),
    payload: { addons: ['named-driver', 'modifications', 'protected-ncd'] }
  },
  {
    id: 'named-driver-who',
    collects: ndWho.meta.collects,
    handler: postHandlerOf(ndWho),
    seed: { addons: ['named-driver'] },
    payload: {
      driverName: 'Sam Passenger',
      'driverDob-day': '2',
      'driverDob-month': '3',
      'driverDob-year': '1988'
    }
  },
  {
    id: 'named-driver-relationship',
    collects: ndRel.meta.collects,
    handler: postHandlerOf(ndRel),
    seed: { addons: ['named-driver'] },
    payload: { relationship: 'spouse' }
  },
  {
    id: 'modifications-describe',
    collects: modDesc.meta.collects,
    handler: postHandlerOf(modDesc),
    seed: { addons: ['modifications'] },
    payload: { modDescription: 'Lowered suspension and alloy wheels' }
  },
  {
    id: 'modifications-value',
    collects: modVal.meta.collects,
    handler: postHandlerOf(modVal),
    seed: { addons: ['modifications'] },
    payload: { modValue: '1500' }
  },
  {
    id: 'protected-ncd-years',
    collects: ncd.meta.collects,
    handler: postHandlerOf(ncd),
    seed: { addons: ['protected-ncd'] },
    payload: { ncdYears: '5' }
  }
]

describe('controller <-> model commit contract', () => {
  beforeAll(() => buildDispatch(dispatchPages))
  beforeEach(() => store.clear())

  it.each(cases)(
    '$id commits exactly its committable collects',
    ({ collects, handler, payload, seed }) => {
      const result = drive(handler, { payload, seed })
      expect(new Set(committedIds(result))).toEqual(
        new Set(committableCollects(collects))
      )
    }
  )

  // Claims is the one indexed collection: the LIST page declares `collects: ['claims']`,
  // but the identity-minting write happens in the ENTRY sub-page's append. The contract
  // still holds, measured against the handler that actually commits.
  it('claims is committed by the entry (append) handler it declares', () => {
    expect(claimsList.meta.collects).toEqual(['claims'])
    const postAdd = claimsEntry.routes.find(
      (route) => route.method === 'POST' && route.path.endsWith('claims/add')
    ).handler
    const result = drive(postAdd, {
      seed: { hadClaims: 'yes' }, // keeps the claims collection in scope
      payload: { claimType: 'accident', claimAmount: '500' }
    })
    expect(new Set(committedIds(result))).toEqual(
      new Set(committableCollects(claimsList.meta.collects))
    )
  })
})
