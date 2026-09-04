import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import { driveHandler } from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'

import * as search from '../search/search.controller.js'
import { copy } from './copy.en.js'
import { copy as copyCy } from './copy.cy.js'

const BOS_TAURUS = 'Bos taurus'

const leaves = (node, path = []) =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, [...path, key])
      )
    : [{ path: path.join('.'), value: node }]

describe('#copy', () => {
  // Parameterised strings are copy FUNCTIONS: a leaf may be a function of
  // sample arguments returning the finished sentence.
  it('Should have a non-empty string (or string-returning function) at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      const text =
        typeof value === 'function' ? value('sample', 2, 3, 4) : value
      expect(typeof text, `${path} must resolve to a string`).toBe('string')
      expect(text.trim().length, `${path} must not be empty`).toBeGreaterThan(0)
    }
  })

  it('Should point the commodity-code lookup at the Trade Tariff tool', () => {
    expect(copy.search.help.lookupHref).toBe('https://www.gov.uk/trade-tariff')
    expect(copyCy.search.help.lookupHref).toBe(
      'https://www.gov.uk/trade-tariff'
    )
  })

  // A user reading only the first sentence could conclude that no health
  // certificate means no notification. The second sentence closes that off.
  it('Should tell the user that a consignment without a health certificate must still be notified', () => {
    expect(copy.search.inset).toBe(
      'A separate notification is required for each health certificate. Consignments that do not require a health certificate must still be notified.'
    )
    expect(copyCy.search.inset).toContain(
      'Rhaid hysbysu llwythi nad oes angen tystysgrif iechyd arnynt o hyd.'
    )
  })

  it('Should interpolate countDrop', () => {
    expect(copy.consignmentDetails.errors.countDrop(3, BOS_TAURUS, 2)).toBe(
      'You have 3 identifier records for Bos taurus but entered 2 animals. Remove identifier records or keep the higher count.'
    )
    expect(
      copy.consignmentDetails.errors.countDrop(1, BOS_TAURUS, 1)
    ).toContain('1 identifier record for')
  })

  it('Should interpolate counter', () => {
    expect(copy.identification.counter(BOS_TAURUS, 2, 2)).toBe(
      'Enter details for Bos taurus 2 of 2'
    )
  })

  it('Should interpolate overCount', () => {
    expect(copy.identification.overCount(1, BOS_TAURUS, 2, 1)).toBe(
      'This commodity line lists 1 Bos taurus animals but you have entered details for 2. Remove 1 to continue.'
    )
  })

  // The identification page's summary carries the animal count the
  // consignment-details table has no column for, so it owns its own heads
  // rather than borrowing that table's.
  it('Should head the identification summary with the code, the common name and the animal count', () => {
    expect(copy.identification.summary).toMatchObject({
      caption: 'Selected commodities',
      commodityCode: 'Commodity code',
      commonName: 'Common name',
      numberOfAnimals: 'Number of animals',
      change: 'Change'
    })
    expect(copy.identification.addAnotherCommodity).toBe(
      'Add another commodity'
    )
  })

  // Every card gets the same link, so it names no species — it says what it
  // changes, not which animal it changes it for.
  it('Should label the route back to the animal count without naming a species', () => {
    expect(copy.identification.changeAnimalCount).toBe(
      'Change number of animals'
    )
    expect(copyCy.identification.changeAnimalCount).toBe(
      'Newid nifer yr anifeiliaid'
    )
  })

  // Saying the address is required tells the trader nothing about why an
  // invented one is a problem. The warning names the offence and the second
  // bullet names APHA, who will turn up at whatever address was given.
  it('Should warn that a false permanent address is fraud and say APHA can check it', () => {
    expect(copy.identification.permanentAddress.warning).toBe(
      'Providing a false address is an act of fraud'
    )
    expect(copy.identification.permanentAddress.definitionLeadIn).toBe(
      'A permanent address is where an animal:'
    )
    expect(copy.identification.permanentAddress.definitionItems).toEqual([
      'will permanently reside',
      'can be checked by the Animal and Plant Health Agency (APHA)'
    ])
    expect(copy.identification.permanentAddress.question).toBe(
      'Where will their permanent address be?'
    )
    expect(copyCy.identification.permanentAddress.definitionItems[1]).toContain(
      'APHA'
    )
  })

  it('Should interpolate capReached', () => {
    expect(copy.identification.errors.capReached(2)).toBe(
      'You have already entered details for all 2 animals — remove a record before adding another'
    )
  })
})

describe('GET commodities search — copy reaches the view', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should supply the page copy namespace and the shared chrome copy', async () => {
    const get = search.routes.find((route) => route.method === 'GET').handler
    const result = await driveHandler(get)
    expect(result.view.context.copy).toBe(copy.search)
    expect(result.view.context.pageTitle).toBe(copy.search.title)
    expect(result.view.context.sharedCopy.saveActions.saveAndContinue).toBe(
      'Save and continue'
    )
  })
})
