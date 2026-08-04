import { describe, expect, it } from 'vitest'

import { addressText, countryText, detailLines } from './address-lines.js'

const plantRecord = {
  name: 'Orchard Export SAS',
  telephone: '+33 4 72 00 00 00',
  email: 'exports@example.com',
  address: {
    addressLine1: '12 Rue des Vergers',
    addressLine2: 'Example Business Park',
    addressLine3: 'Example District',
    city: 'Lyon',
    postcode: '69001',
    country: 'FR'
  }
}

const withoutOptionalLines = {
  ...plantRecord,
  address: { ...plantRecord.address, addressLine2: '', addressLine3: '' }
}

describe('consignor picker address lines', () => {
  it('renders every address part in order', () => {
    expect(addressText(plantRecord.address)).toBe(
      '12 Rue des Vergers, Example Business Park, Example District, Lyon, 69001'
    )
  })

  it('omits blank optional lines without leaving a stray comma', () => {
    expect(addressText(withoutOptionalLines.address)).toBe(
      '12 Rue des Vergers, Lyon, 69001'
    )
  })

  it('ends the detail lines with the country label, telephone and email', () => {
    expect(detailLines(plantRecord)).toEqual([
      'Orchard Export SAS',
      '12 Rue des Vergers',
      'Example Business Park',
      'Example District',
      'Lyon',
      '69001',
      'France',
      '+33 4 72 00 00 00',
      'exports@example.com'
    ])
  })

  it('drops a blank telephone and email rather than rendering a gap', () => {
    expect(
      detailLines({ ...withoutOptionalLines, telephone: '', email: '' })
    ).toEqual([
      'Orchard Export SAS',
      '12 Rue des Vergers',
      'Lyon',
      '69001',
      'France'
    ])
  })

  it('renders none of a live-animals-shaped record’s own address values', () => {
    const liveShaped = {
      name: 'Astra Rosales',
      address: {
        addressLine1: 'Rua da Boavista 100',
        townOrCity: 'Porto',
        county: 'Norte',
        postalOrZipCode: '4050-113',
        country: 'PT'
      }
    }

    expect(addressText(liveShaped.address)).toBe('Rua da Boavista 100')
    expect(detailLines(liveShaped)).toEqual([
      'Astra Rosales',
      'Rua da Boavista 100',
      'Portugal'
    ])
  })

  it('resolves country codes to labels and leaves an unknown code unchanged', () => {
    expect(countryText('FR')).toBe('France')
    expect(countryText('GB-ENG')).toBe('England')
    expect(countryText('ZZ')).toBe('ZZ')
    expect(countryText('')).toBe('')
    expect(countryText(undefined)).toBe('')
  })
})
