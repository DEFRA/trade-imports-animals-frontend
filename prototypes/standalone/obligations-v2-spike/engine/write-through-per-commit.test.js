import { beforeEach, describe, expect, it } from 'vitest'
import { appendEntryAt, commit, removeEntryAt, updateEntryAt } from './index.js'
import { records } from './persistence/records.js'
import { configureReadyForQuote } from './read.js'
import { JOURNEY_COOKIE } from './journey.js'

/**
 * NW-4 shape proof (load-bearing) — WRITE-THROUGH ON EVERY COMMIT. Drives the
 * public `state.commit` and asserts the durable RECORDS port already holds the
 * answers BEFORE any submit runs — twice, so a second save-and-continue is seen
 * to overwrite the first. This is the "durable writes happened on every save"
 * property the two-port split must preserve. `readyForQuote` is stubbed false so
 * `makeScope` needs no boot dispatch index; readiness itself is tested elsewhere.
 */
const stubH = () => ({
  view: (view, ctx) => ({ view, ctx }),
  redirect: (to) => ({ redirect: to }),
  state: () => {}
})

let journeyId
const req = () => ({
  payload: {},
  params: {},
  query: {},
  state: { [JOURNEY_COOKIE]: journeyId },
  headers: {}
})

describe('write-through on every commit', () => {
  beforeEach(() => {
    records.clear()
    configureReadyForQuote(() => false)
    journeyId = records.create().journeyId
  })

  it('persists to the records port on the first commit, before any submit', () => {
    commit(req(), stubH(), { email: 'a@b.com' })
    expect(records.load({ journeyId }).answers).toEqual({ email: 'a@b.com' })
  })

  it('overwrites the durable record on a second commit', () => {
    commit(req(), stubH(), { email: 'a@b.com' })
    commit(req(), stubH(), { fullName: 'Alex' })
    expect(records.load({ journeyId }).answers).toEqual({
      email: 'a@b.com',
      fullName: 'Alex'
    })
  })
})

/**
 * NW-4 shape proof, WIDENED — write-through fires on EVERY collection mutation,
 * not just `commit`. Drives the three save-and-continue mutators of an indexed
 * collection (`appendEntryAt` / `updateEntryAt` / `removeEntryAt`) and asserts
 * the durable RECORDS port already holds the mutated list BEFORE any submit —
 * the same per-save durability the `commit` cases above pin, proven directly
 * for the collection surface. `addons: ['named-driver']` keeps `drivers` in
 * scope so `removeEntryAt`'s reconcile splices rather than scope-wipes the
 * collection (mirrors `store-ops.test.js`).
 */
const seed = (answers) =>
  records.saveAnswers(journeyId, { addons: ['named-driver'], ...answers })
const durableDrivers = () => records.load({ journeyId }).answers.drivers

describe('write-through on every collection mutation', () => {
  beforeEach(() => {
    records.clear()
    configureReadyForQuote(() => false)
    journeyId = records.create().journeyId
  })

  it('persists an appended entry to the records port, before any submit', () => {
    seed({ drivers: [{ driverName: 'Sam' }] })
    expect(durableDrivers()).toEqual([{ driverName: 'Sam' }])
    appendEntryAt(req(), stubH(), ['drivers'], { driverName: 'Jo' })
    expect(durableDrivers()).toEqual([
      { driverName: 'Sam' },
      { driverName: 'Jo' }
    ])
  })

  it('persists an updated entry to the records port, before any submit', () => {
    seed({ drivers: [{ driverName: 'Sam' }, { driverName: 'Jo' }] })
    expect(durableDrivers()).toEqual([
      { driverName: 'Sam' },
      { driverName: 'Jo' }
    ])
    updateEntryAt(req(), stubH(), ['drivers'], 0, { driverName: 'Alex' })
    expect(durableDrivers()).toEqual([
      { driverName: 'Alex' },
      { driverName: 'Jo' }
    ])
  })

  it('persists a removed entry to the records port, before any submit', () => {
    seed({ drivers: [{ driverName: 'Sam' }, { driverName: 'Jo' }] })
    expect(durableDrivers()).toEqual([
      { driverName: 'Sam' },
      { driverName: 'Jo' }
    ])
    removeEntryAt(req(), stubH(), ['drivers'], 0)
    expect(durableDrivers()).toEqual([{ driverName: 'Jo' }])
  })
})
