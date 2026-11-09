import { describe, expect, it } from 'vitest'

import { insetAddressLines, pickerAddressLines } from './address-lines.js'

const FULL_STREET_LINES = ['Dockside Business Park', 'Warehouse 3', 'East Quay']
const SHORT_STREET_LINE = '41 Commerce Way'

const fullAddress = {
  addressLine1: FULL_STREET_LINES[0],
  addressLine2: FULL_STREET_LINES[1],
  addressLine3: FULL_STREET_LINES[2],
  townOrCity: 'Hull',
  county: 'East Riding of Yorkshire',
  postcode: 'HU9 5PX',
  country: 'United Kingdom'
}

const shortAddress = {
  addressLine1: SHORT_STREET_LINE,
  addressLine2: '',
  townOrCity: 'Bristol',
  county: '',
  postcode: 'BS11 9DQ',
  country: 'United Kingdom'
}

describe('#pickerAddressLines', () => {
  it('Should give each street line its own line, then town or city, county and postcode on one line, without the country', () => {
    expect(pickerAddressLines(fullAddress)).toEqual([
      ...FULL_STREET_LINES,
      'Hull, East Riding of Yorkshire, HU9 5PX'
    ])
  })

  it('Should give only the filled street line, then town or city and postcode on one line', () => {
    expect(pickerAddressLines(shortAddress)).toEqual([
      SHORT_STREET_LINE,
      'Bristol, BS11 9DQ'
    ])
  })
})

describe('#insetAddressLines', () => {
  it('Should give each street line its own line, then town or city, county, postcode and country on one line', () => {
    expect(insetAddressLines({ address: fullAddress })).toEqual([
      ...FULL_STREET_LINES,
      'Hull, East Riding of Yorkshire, HU9 5PX, United Kingdom'
    ])
  })

  it('Should give only the filled street line, then town or city, postcode and country on one line', () => {
    expect(insetAddressLines({ address: shortAddress })).toEqual([
      SHORT_STREET_LINE,
      'Bristol, BS11 9DQ, United Kingdom'
    ])
  })
})
