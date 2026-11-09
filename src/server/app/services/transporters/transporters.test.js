import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import * as transporters from './index.js'
import { createTransporter, forgetStubTransporters } from './stub/index.js'
import * as addressBook from '../address-book/index.js'
import { addressCountries } from '../countries/index.js'
import * as transportReference from '../transport-reference/index.js'
import { WIRE_PRIVATE } from './wire-types.js'

const partiesOfType = (type) =>
  transporters.parties().filter((record) => record.type === type)

describe('#parties', () => {
  test('Should return every transporter with a stable id', () => {
    const records = transporters.parties()

    expect(records.length).toBeGreaterThan(0)

    const ids = records.map((record) => record.id)
    expect(ids.every((id) => id && typeof id === 'string')).toBe(true)
    expect(new Set(ids).size).toBe(records.length)
  })

  test('Should type every transporter as one the journey can ask for', () => {
    const types = transportReference.transporterTypes()

    for (const record of transporters.parties()) {
      expect(types).toContain(record.type)
    }
  })

  test('Should hold both kinds of transporter on the one list', () => {
    const types = new Set(transporters.parties().map((record) => record.type))

    expect(types).toEqual(
      new Set([transporters.COMMERCIAL, transporters.PRIVATE])
    )
  })

  // The list shows the status as a tag, so a record without one would render a
  // blank tag rather than say nothing.
  test('Should say of every transporter whether it is approved yet', () => {
    for (const record of transporters.parties()) {
      expect([transporters.APPROVED, transporters.NEW], record.id).toContain(
        record.status
      )
    }
  })

  test('Should hold both approval statuses, so the list distinguishes them', () => {
    const statuses = new Set(
      transporters.parties().map((record) => record.status)
    )

    expect(statuses).toEqual(new Set([transporters.APPROVED, transporters.NEW]))
  })

  test('Should carry the approval number the address book cannot represent on every commercial record', () => {
    for (const record of partiesOfType(transporters.COMMERCIAL)) {
      expect(record.approvalNumber).toBeTruthy()
    }
  })

  test('Should carry a country code on every commercial record', () => {
    for (const record of partiesOfType(transporters.COMMERCIAL)) {
      expect(record.address.countryCode, record.id).toBeTruthy()
    }
  })

  test('Should carry every field the private-transporter form makes mandatory on every private record', async () => {
    const addresses = await addressCountries()

    for (const record of partiesOfType(transporters.PRIVATE)) {
      expect(record.name, `${record.id} name`).toBeTruthy()

      for (const field of [
        'addressLine1',
        'townOrCity',
        'postcode',
        'country',
        'countryCode',
        'phone',
        'email'
      ]) {
        expect(record.address[field], `${record.id} ${field}`).toBeTruthy()
      }

      expect(addresses, `${record.id} country`).toContain(
        record.address.country
      )
      expect(record.approvalNumber).toBeUndefined()
    }
  })

  test('Should resolve synchronously, so the pickers can validate at module load', () => {
    expect(transporters.parties()).not.toBeInstanceOf(Promise)
  })
})

describe('separation from the address book', () => {
  test('Should not be reachable through the address book', async () => {
    // The suite already runs in stub mode, which is where both books are canned.
    const book = await addressBook.all('5900001')

    const transporterIds = transporters.parties().map((record) => record.id)

    expect(book.some((record) => transporterIds.includes(record.id))).toBe(
      false
    )
    expect(book.some((record) => record.approvalNumber)).toBe(false)
  })

  test('Should carry no roles and no address type on a transporter the organisation added', async () => {
    const kept = await createTransporter('5900001', {
      type: WIRE_PRIVATE,
      name: 'Separation Haulage Ltd',
      addressLine1: '1 Test Street',
      townOrCity: 'Testville',
      postcode: 'TE5 7ER',
      countryCode: 'GB',
      phone: '01632 960000',
      email: 'ops@separation-haulage.example.com'
    })

    const [found] = (await transporters.partiesFor('5900001')).filter(
      (record) => record.id === kept.id
    )

    expect(found.roles).toBeUndefined()
    expect(found.addressType).toBeUndefined()
  })
})

// A transporter a trader types in has to live in the address book, or the
// same nine fields are retyped on the next one.
describe('the transporters an organisation has added for itself', () => {
  const ORG = '5900001'
  const ANOTHER_ORG = '5900002'
  const HAULIER_NAME = 'Jean Dupont'

  const haulierWire = (overrides = {}) => ({
    type: WIRE_PRIVATE,
    name: HAULIER_NAME,
    addressLine1: '10 Rue de la Ferme',
    addressLine2: '',
    townOrCity: 'Calais',
    county: 'Pas-de-Calais',
    postcode: '62100',
    countryCode: 'FR',
    phone: '+33 3 21 00 00 00',
    email: 'jean.dupont@example.fr',
    ...overrides
  })

  beforeEach(forgetStubTransporters)
  afterEach(forgetStubTransporters)

  test('Should offer only the transporters the service ships to an organisation that has added nothing', async () => {
    expect(await transporters.partiesFor(ORG)).toEqual(transporters.parties())
  })

  test('Should put a transporter it has added ahead of the ones the service ships', async () => {
    await createTransporter(ORG, haulierWire())

    const [first, ...rest] = await transporters.partiesFor(ORG)
    expect(first.name).toBe(HAULIER_NAME)
    expect(first.type).toBe(transporters.PRIVATE)
    expect(first.status).toBe(transporters.NEW)
    expect(rest).toEqual(transporters.parties())
  })

  test('Should give an added transporter an id of its own, so the list can pick it', async () => {
    const kept = await createTransporter(ORG, haulierWire())

    expect(kept.id).toBeTruthy()
    expect(transporters.parties().map((record) => record.id)).not.toContain(
      kept.id
    )
    const found = (await transporters.partiesFor(ORG)).find(
      (record) => record.id === kept.id
    )
    expect(found.name).toBe(HAULIER_NAME)
  })

  test('Should list the newest addition first', async () => {
    await createTransporter(ORG, haulierWire())
    await createTransporter(ORG, haulierWire({ name: 'Marie Leclerc' }))

    const list = await transporters.partiesFor(ORG)
    expect(list.slice(0, 2).map((record) => record.name)).toEqual([
      'Marie Leclerc',
      HAULIER_NAME
    ])
  })

  test('Should keep only the newest record when the organisation has added the same name twice', async () => {
    await createTransporter(
      ORG,
      haulierWire({ addressLine1: '10 Rue de la Ferme' })
    )
    const newest = await createTransporter(
      ORG,
      haulierWire({ addressLine1: '22 Avenue des Fermes' })
    )

    const list = await transporters.partiesFor(ORG)
    const matches = list.filter((record) => record.name === HAULIER_NAME)
    expect(matches).toHaveLength(1)
    expect(matches[0].id).toBe(newest.id)
    expect(matches[0].address.addressLine1).toBe('22 Avenue des Fermes')
  })

  // The address book holds "Jean Dupont" and "Aberdeen Livestock Ltd" as
  // separate records, however their names are typed, so the list's own
  // de-duplication is what keeps one row per name.
  test('Should replace a shipped transporter the organisation has added under the same name', async () => {
    const shipped = transporters
      .parties()
      .find((record) => record.name === 'Aberdeen Livestock Ltd')
    const kept = await createTransporter(
      ORG,
      haulierWire({ name: '  aberdeen   LIVESTOCK ltd  ' })
    )

    const list = await transporters.partiesFor(ORG)
    expect(
      list.filter(
        (record) =>
          record.name.trim().toLowerCase().replace(/\s+/gu, ' ') ===
          'aberdeen livestock ltd'
      )
    ).toHaveLength(1)
    expect(list.some((record) => record.id === shipped.id)).toBe(false)
    expect(list[0].id).toBe(kept.id)
    expect(list).toHaveLength(transporters.parties().length)
  })

  test('Should keep the transporters one organisation added off every other list', async () => {
    const kept = await createTransporter(ORG, haulierWire())

    const anotherOrgList = await transporters.partiesFor(ANOTHER_ORG)
    expect(anotherOrgList).toEqual(transporters.parties())
    expect(
      anotherOrgList.find((record) => record.id === kept.id)
    ).toBeUndefined()
  })
})
