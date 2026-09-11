import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import * as transporters from './index.js'
import * as addressBook from '../address-book/index.js'
import { addressCountries } from '../countries/index.js'
import * as transportReference from '../transport-reference/index.js'

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
    for (const record of transporters.commercialParties()) {
      expect(record.approvalNumber).toBeTruthy()
    }
  })

  test('Should carry every field the private-transporter form makes mandatory on every private record', () => {
    const addresses = addressCountries()

    for (const record of transporters
      .parties()
      .filter((candidate) => candidate.type === transporters.PRIVATE)) {
      expect(record.name, `${record.id} name`).toBeTruthy()

      for (const field of [
        'addressLine1',
        'townOrCity',
        'postalOrZipCode',
        'country',
        'telephoneNumber',
        'emailAddress'
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

describe('#commercialParties', () => {
  test('Should narrow the list to the approved commercial register', () => {
    const commercial = transporters.commercialParties()

    expect(commercial.length).toBeGreaterThan(0)
    expect(commercial.length).toBeLessThan(transporters.parties().length)
    expect(
      commercial.every((record) => record.type === transporters.COMMERCIAL)
    ).toBe(true)
  })
})

describe('#party', () => {
  test('Should look a transporter up by its id', () => {
    const first = transporters.parties()[0]

    expect(transporters.party(first.id).name).toBe(first.name)
  })

  test('Should return undefined for an id that is not a transporter', () => {
    expect(transporters.party('not-a-transporter')).toBeUndefined()
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
})

// A transporter a trader types in has to live somewhere other than the
// notification, or the same nine fields are retyped on the next one.
describe('the transporters an organisation has added for itself', () => {
  const ORG = '5900001'
  const ANOTHER_ORG = '5900002'
  const HAULIER_NAME = 'Jean Dupont'

  const haulier = (overrides = {}) => ({
    type: transporters.PRIVATE,
    status: transporters.NEW,
    name: HAULIER_NAME,
    address: {
      addressLine1: '10 Rue de la Ferme',
      addressLine2: '',
      townOrCity: 'Calais',
      county: 'Pas-de-Calais',
      postalOrZipCode: '62100',
      country: 'France',
      telephoneNumber: '+33 3 21 00 00 00',
      emailAddress: 'jean.dupont@example.fr'
    },
    ...overrides
  })

  beforeEach(() => transporters.forgetAddedTransporters())
  afterEach(() => transporters.forgetAddedTransporters())

  test('Should offer only the shipped register to an organisation that has added nothing', () => {
    expect(transporters.partiesFor(ORG)).toEqual(transporters.parties())
  })

  test('Should put a transporter it has added ahead of the ones the service ships', () => {
    transporters.rememberTransporter(ORG, haulier())

    const [first, ...rest] = transporters.partiesFor(ORG)
    expect(first.name).toBe(HAULIER_NAME)
    expect(first.type).toBe(transporters.PRIVATE)
    expect(first.status).toBe(transporters.NEW)
    expect(rest).toEqual(transporters.parties())
  })

  test('Should give an added transporter an id of its own, so the list can pick it', () => {
    const kept = transporters.rememberTransporter(ORG, haulier())

    expect(kept.id).toBeTruthy()
    expect(transporters.parties().map((record) => record.id)).not.toContain(
      kept.id
    )
    expect(
      transporters.partiesFor(ORG).find((record) => record.id === kept.id).name
    ).toBe(HAULIER_NAME)
  })

  test('Should keep the newest addition at the top, the way design release 1 shows it', () => {
    transporters.rememberTransporter(ORG, haulier())
    transporters.rememberTransporter(ORG, haulier({ name: 'Marie Leclerc' }))

    expect(
      transporters
        .partiesFor(ORG)
        .slice(0, 2)
        .map((record) => record.name)
    ).toEqual(['Marie Leclerc', HAULIER_NAME])
  })

  // Otherwise a trader correcting a typo ends up with two rows for the one
  // haulier and no way to tell them apart.
  test('Should correct a transporter entered again rather than add a second row for it', () => {
    const first = transporters.rememberTransporter(ORG, haulier())
    const corrected = transporters.rememberTransporter(
      ORG,
      // The same haulier, typed with the casing and spacing of a second go.
      haulier({
        name: '  jean   dupont  ',
        address: { ...haulier().address, townOrCity: 'Dunkerque' }
      })
    )

    expect(corrected.id).toBe(first.id)
    expect(transporters.partiesFor(ORG)).toHaveLength(
      transporters.parties().length + 1
    )
    expect(
      transporters.partiesFor(ORG).find((record) => record.id === first.id)
        .address.townOrCity
    ).toBe('Dunkerque')
  })

  test('Should replace a shipped transporter the organisation has added under the same name', () => {
    const shipped = transporters
      .parties()
      .find((record) => record.name === 'Aberdeen Livestock Ltd')
    const kept = transporters.rememberTransporter(
      ORG,
      haulier({ name: '  aberdeen   LIVESTOCK ltd  ' })
    )

    const list = transporters.partiesFor(ORG)
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

  test('Should keep the transporters one organisation added off every other list', () => {
    const kept = transporters.rememberTransporter(ORG, haulier())

    expect(transporters.partiesFor(ANOTHER_ORG)).toEqual(transporters.parties())
    expect(
      transporters
        .partiesFor(ANOTHER_ORG)
        .find((record) => record.id === kept.id)
    ).toBeUndefined()
  })

  // organisationIdOf resolves to undefined on an unauthenticated request, and
  // filing the record under a guess would hand it to the wrong organisation.
  test('Should keep nothing when there is no organisation to file it under', () => {
    expect(
      transporters.rememberTransporter(undefined, haulier())
    ).toBeUndefined()
    expect(transporters.partiesFor(undefined)).toEqual(transporters.parties())
  })

  test('Should keep nothing when the transporter has no name to be found by', () => {
    expect(
      transporters.rememberTransporter(ORG, haulier({ name: '   ' }))
    ).toBeUndefined()
    expect(transporters.partiesFor(ORG)).toEqual(transporters.parties())
  })

  test('Should resolve synchronously, so the list can validate what it renders', () => {
    transporters.rememberTransporter(ORG, haulier())

    expect(transporters.partiesFor(ORG)).not.toBeInstanceOf(Promise)
  })
})
