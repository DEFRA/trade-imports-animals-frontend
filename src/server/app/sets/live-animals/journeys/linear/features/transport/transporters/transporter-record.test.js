import { describe, expect, it } from 'vitest'

import {
  COMMERCIAL,
  PRIVATE
} from '../../../../../../../services/transporters/index.js'
import { addressSummary, transporterAnswer } from './transporter-record.js'

const privateAddress = {
  addressLine1: '12 Harbour Road',
  addressLine2: '',
  townOrCity: 'Aberdeen',
  county: 'Aberdeenshire',
  postalOrZipCode: 'AB11 5DQ',
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

describe('#transporterAnswer', () => {
  it('Should answer a private pick with the private transporter alone', () => {
    const record = {
      id: 'aberdeen-livestock',
      type: PRIVATE,
      name: 'Aberdeen Livestock Ltd',
      address: privateAddress
    }

    const answer = transporterAnswer(record)

    expect(answer).toEqual({
      transporterType: PRIVATE,
      privateTransporter: {
        name: 'Aberdeen Livestock Ltd',
        address: privateAddress
      }
    })
    expect(answer).not.toHaveProperty('commercialTransporter')
    expect(answer.privateTransporter).not.toHaveProperty('approvalNumber')
    expect(answer.privateTransporter.address).not.toBe(record.address)
  })

  it('Should answer a commercial pick with the approval number and nothing private', () => {
    const record = {
      id: 'garcia-livestock-transport',
      type: COMMERCIAL,
      name: 'García Livestock Transport SL',
      approvalNumber: 'ES-T2-45001294',
      address: commercialAddress
    }

    const answer = transporterAnswer(record)

    expect(answer).toEqual({
      transporterType: COMMERCIAL,
      commercialTransporter: {
        name: 'García Livestock Transport SL',
        address: commercialAddress,
        approvalNumber: 'ES-T2-45001294'
      }
    })
    expect(answer).not.toHaveProperty('privateTransporter')
    expect(answer.commercialTransporter.address).not.toBe(record.address)
  })
})
