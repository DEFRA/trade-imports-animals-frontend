import { describe, expect, it } from 'vitest'

import { addressSummary } from './address-summary.js'

const privateAddress = {
  addressLine1: '12 Harbour Road',
  addressLine2: '',
  townOrCity: 'Aberdeen',
  county: 'Aberdeenshire',
  postcode: 'AB11 5DQ',
  country: 'United Kingdom'
}

const commercialAddress = {
  addressLine1: '43 East Hague Extension',
  addressLine2: 'Delectus sitodio p. Laborum Odio tempor',
  addressLine3: 'Quasoccaecat ut ear, 30055',
  country: 'Switzerland'
}

describe('#addressSummary', () => {
  it('Should read a private address as street, town, county, postcode, country', () => {
    expect(addressSummary(privateAddress)).toBe(
      '12 Harbour Road, Aberdeen, Aberdeenshire, AB11 5DQ, United Kingdom'
    )
  })

  it('Should drop every blank part rather than leaving an empty slot', () => {
    expect(addressSummary({ ...privateAddress, county: '' })).toBe(
      '12 Harbour Road, Aberdeen, AB11 5DQ, United Kingdom'
    )
  })

  it('Should read a commercial address as its numbered lines then the country', () => {
    expect(addressSummary(commercialAddress)).toBe(
      '43 East Hague Extension, Delectus sitodio p. Laborum Odio tempor, Quasoccaecat ut ear, 30055, Switzerland'
    )
  })

  it('Should summarise a missing or empty address as an empty string', () => {
    expect(addressSummary()).toBe('')
    expect(addressSummary({})).toBe('')
  })
})
