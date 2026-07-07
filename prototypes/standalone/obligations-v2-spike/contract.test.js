import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from './flow/dispatch.js'
import { readyForQuote } from './flow/section-status.js'
import { registry } from './registry.js'
import { store } from './engine/store.js'
import { configureReadyForQuote } from './engine/read.js'
import {
  driveHandler,
  postHandlerOf,
  postHandlerEndingWith
} from './engine/test-support.js'
import { isAnswered } from './lib/answered.js'
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
import * as driversHub from './features/named-driver/drivers-hub.controller.js'
import * as driverEntry from './features/named-driver/driver-entry.controller.js'
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

/** Drive one real handler against the store and return before/after answers. */
const drive = driveHandler

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
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForQuote(readyForQuote)
  })
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
    const postAdd = postHandlerEndingWith(claimsEntry, 'claims/add')
    const result = drive(postAdd, {
      seed: { hadClaims: 'yes' }, // keeps the claims collection in scope
      payload: { claimType: 'accident', claimAmount: '500' }
    })
    expect(new Set(committedIds(result))).toEqual(
      new Set(committableCollects(claimsList.meta.collects))
    )
  })

  // Drivers is the nested collection: the HUB declares `collects: ['drivers']`,
  // the identity-minting write happens in the driver ENTRY sub-page's append.
  // Same contract shape as claims, one level up.
  it('drivers is committed by the entry (append) handler it declares', () => {
    expect(driversHub.meta.collects).toEqual(['drivers'])
    const postAdd = postHandlerEndingWith(driverEntry, 'named-driver/add')
    const result = drive(postAdd, {
      seed: { addons: ['named-driver'] }, // keeps the drivers collection in scope
      payload: { driverName: 'Sam Passenger', relationship: 'spouse' }
    })
    expect(new Set(committedIds(result))).toEqual(
      new Set(committableCollects(driversHub.meta.collects))
    )
  })
})
