import { beforeEach, describe, expect, it } from 'vitest'
import { appendEntryAt, commit, removeEntryAt, updateEntryAt } from './index.js'
import { records } from './persistence/records.js'
import { configureReadyForQuote } from './read.js'
import { stubH, journeyRequest, seedNamedDriver } from './test-support.js'

let journeyId
const buildRequest = () => journeyRequest(journeyId)

describe('write-through on every commit', () => {
  beforeEach(() => {
    records.clear()
    configureReadyForQuote(() => false)
    journeyId = records.create().journeyId
  })

  it('Should persist to the records port on the first commit, before any submit', () => {
    commit(buildRequest(), stubH(), { countryOfOrigin: 'FR' })
    expect(records.load({ journeyId }).answers).toEqual({
      countryOfOrigin: 'FR'
    })
  })

  it('Should overwrite the durable record on a second commit', () => {
    commit(buildRequest(), stubH(), { countryOfOrigin: 'FR' })
    commit(buildRequest(), stubH(), { internalReferenceNumber: 'Imports456GB' })
    expect(records.load({ journeyId }).answers).toEqual({
      countryOfOrigin: 'FR',
      internalReferenceNumber: 'Imports456GB'
    })
  })
})

const seed = (answers) => seedNamedDriver(records, journeyId, answers)
const durableDrivers = () => records.load({ journeyId }).answers.drivers

describe('write-through on every collection mutation', () => {
  beforeEach(() => {
    records.clear()
    configureReadyForQuote(() => false)
    journeyId = records.create().journeyId
  })

  it('Should persist an appended entry to the records port, before any submit', () => {
    seed({ drivers: [{ driverName: 'Sam' }] })
    expect(durableDrivers()).toEqual([{ driverName: 'Sam' }])
    appendEntryAt(buildRequest(), stubH(), ['drivers'], { driverName: 'Jo' })
    expect(durableDrivers()).toEqual([
      { driverName: 'Sam' },
      { driverName: 'Jo' }
    ])
  })

  it('Should persist an updated entry to the records port, before any submit', () => {
    seed({ drivers: [{ driverName: 'Sam' }, { driverName: 'Jo' }] })
    expect(durableDrivers()).toEqual([
      { driverName: 'Sam' },
      { driverName: 'Jo' }
    ])
    updateEntryAt(buildRequest(), stubH(), ['drivers'], 0, {
      driverName: 'Alex'
    })
    expect(durableDrivers()).toEqual([
      { driverName: 'Alex' },
      { driverName: 'Jo' }
    ])
  })

  it('Should persist a removed entry to the records port, before any submit', () => {
    seed({ drivers: [{ driverName: 'Sam' }, { driverName: 'Jo' }] })
    expect(durableDrivers()).toEqual([
      { driverName: 'Sam' },
      { driverName: 'Jo' }
    ])
    removeEntryAt(buildRequest(), stubH(), ['drivers'], 0)
    expect(durableDrivers()).toEqual([{ driverName: 'Jo' }])
  })
})
