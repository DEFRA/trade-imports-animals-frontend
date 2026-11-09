import { describe, expect, test } from 'vitest'

import {
  addressBookAnswering,
  resetMocksAndConfigAfterTests
} from '../../engine/test-support.js'
import {
  COMMERCIAL_TRANSPORTER_COUNTRY_CODE,
  COMMERCIAL_TRANSPORTER_COUNTRY_NAME
} from './commercial-country.js'
import { COMMERCIAL, NEW, PRIVATE } from './records.js'
import { transporterRowOf, wireTransporterOf } from './to-wire-transporter.js'
import { WIRE_COMMERCIAL, WIRE_PRIVATE } from './wire-types.js'

const COUNTRY_LIST_ANSWER = { body: JSON.stringify([]) }
const TRANSPORTER_NAME = 'Aberdeen Livestock Ltd'
const ADDRESS_LINE_ONE = '1 Drovers Road'

const wireTransporter = (overrides = {}) => ({
  id: '665f1c2ab3e4d51a2c9d0e77',
  name: TRANSPORTER_NAME,
  type: WIRE_PRIVATE,
  addressLine1: ADDRESS_LINE_ONE,
  townOrCity: 'Aberdeen',
  postcode: 'AB10 1AA',
  countryCode: 'GB',
  phone: '01224 496000',
  email: 'ops@aberdeenlivestock.example',
  ...overrides
})

const party = (overrides = {}) => ({
  name: TRANSPORTER_NAME,
  address: {
    addressLine1: ADDRESS_LINE_ONE,
    townOrCity: 'Aberdeen',
    postcode: 'AB10 1AA',
    countryCode: 'GB',
    phone: '01224 496000',
    email: 'ops@aberdeenlivestock.example'
  },
  ...overrides
})

describe('#transporterRowOf', () => {
  resetMocksAndConfigAfterTests()

  test('Should read a commercial transporter as commercial, under the one country it can be in', async () => {
    addressBookAnswering(COUNTRY_LIST_ANSWER)

    const row = await transporterRowOf(
      wireTransporter({ type: WIRE_COMMERCIAL })
    )

    expect({ type: row.type, country: row.address.country }).toEqual({
      type: COMMERCIAL,
      country: COMMERCIAL_TRANSPORTER_COUNTRY_NAME
    })
  })

  test('Should read any other transporter as private, naming its country as the address book does', async () => {
    addressBookAnswering({
      body: JSON.stringify([{ code: 'GB', name: 'United Kingdom' }])
    })

    const row = await transporterRowOf(wireTransporter())

    expect({ type: row.type, country: row.address.country }).toEqual({
      type: PRIVATE,
      country: 'United Kingdom'
    })
  })

  test('Should mark every address-book transporter as not approved yet', async () => {
    addressBookAnswering(COUNTRY_LIST_ANSWER)

    expect((await transporterRowOf(wireTransporter())).status).toBe(NEW)
  })
})

describe('#wireTransporterOf', () => {
  test('Should store a commercial transporter under the fixed country code, whatever its address holds', () => {
    const wire = wireTransporterOf(
      party({ address: { ...party().address, countryCode: 'GB' } }),
      WIRE_COMMERCIAL
    )

    expect(wire.countryCode).toBe(COMMERCIAL_TRANSPORTER_COUNTRY_CODE)
  })

  test('Should store a private transporter under the country code its address holds', () => {
    expect(wireTransporterOf(party(), WIRE_PRIVATE).countryCode).toBe('GB')
  })

  test('Should send every address field the address book expects, blank where the form left one out', () => {
    const wire = wireTransporterOf(
      { name: TRANSPORTER_NAME, address: { addressLine1: ADDRESS_LINE_ONE } },
      WIRE_PRIVATE
    )

    expect(wire).toEqual({
      name: TRANSPORTER_NAME,
      addressLine1: ADDRESS_LINE_ONE,
      addressLine2: '',
      townOrCity: '',
      county: '',
      postcode: '',
      phone: '',
      email: '',
      countryCode: '',
      type: WIRE_PRIVATE
    })
  })

  test('Should send blank address fields and no country when the party carries no address at all', () => {
    const wire = wireTransporterOf({ name: TRANSPORTER_NAME }, WIRE_PRIVATE)

    expect({ postcode: wire.postcode, countryCode: wire.countryCode }).toEqual({
      postcode: '',
      countryCode: ''
    })
  })

  test('Should send an approval number only when the transporter has one', () => {
    expect(
      Object.hasOwn(wireTransporterOf(party(), WIRE_PRIVATE), 'approvalNumber')
    ).toBe(false)
    expect(
      wireTransporterOf(
        party({ approvalNumber: 'UK/BELF/T2/00104115' }),
        WIRE_COMMERCIAL
      ).approvalNumber
    ).toBe('UK/BELF/T2/00104115')
  })
})
