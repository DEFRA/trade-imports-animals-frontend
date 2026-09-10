import { describe, expect, it } from 'vitest'

import {
  APPROVED,
  COMMERCIAL,
  PRIVATE
} from '../../../../../../../services/transporters/index.js'
import { matchingTransporters } from './rows.js'

const commercial = {
  id: 'garcia-livestock-transport',
  type: COMMERCIAL,
  status: APPROVED,
  name: 'García Livestock Transport SL',
  approvalNumber: 'ES-T2-45001294',
  address: {
    addressLine1: '43 East Hague Extension',
    country: 'Switzerland'
  }
}

const privateRecord = {
  id: 'aberdeen-livestock',
  type: PRIVATE,
  status: APPROVED,
  name: 'Aberdeen Livestock Ltd',
  address: {
    addressLine1: '12 Harbour Road',
    townOrCity: 'Aberdeen',
    postalOrZipCode: 'AB11 5DQ',
    country: 'United Kingdom'
  }
}

const records = [commercial, privateRecord]

const names = (matches) => matches.map((record) => record.name)

describe('#matchingTransporters', () => {
  it('Should leave the whole list standing when nothing has been searched for', () => {
    expect(matchingTransporters(records, '')).toEqual(records)
    expect(matchingTransporters(records, undefined)).toEqual(records)
    expect(matchingTransporters(records, '   ')).toEqual(records)
  })

  it('Should match on the name, whatever case the trader types', () => {
    expect(names(matchingTransporters(records, 'aberdeen livestock'))).toEqual([
      privateRecord.name
    ])
    expect(names(matchingTransporters(records, 'ABERDEEN'))).toEqual([
      privateRecord.name
    ])
  })

  it('Should match on the address', () => {
    expect(names(matchingTransporters(records, 'Switzerland'))).toEqual([
      commercial.name
    ])
    expect(names(matchingTransporters(records, 'AB11 5DQ'))).toEqual([
      privateRecord.name
    ])
  })

  it('Should match on the approval number', () => {
    expect(names(matchingTransporters(records, 'es-t2-45001294'))).toEqual([
      commercial.name
    ])
  })

  // The list this search exists for grows past a screenful, so a term two
  // records share has to leave both standing — in the register's own order.
  it('Should keep every match, in the order the register lists them', () => {
    expect(names(matchingTransporters(records, 'livestock'))).toEqual([
      commercial.name,
      privateRecord.name
    ])
  })

  // The three facts are searched as one string, so a term that runs from the
  // address into the approval number still finds its row.
  it('Should match a term spanning two of the facts it searches', () => {
    expect(names(matchingTransporters(records, 'switzerland es-t2'))).toEqual([
      commercial.name
    ])
  })

  // A trader typing the plain letters they have on a keyboard has to find the
  // accented record — the register carries names the trader cannot easily type.
  it('Should ignore accents on both sides of the match', () => {
    expect(names(matchingTransporters(records, 'garcia'))).toEqual([
      commercial.name
    ])
    expect(names(matchingTransporters(records, 'García'))).toEqual([
      commercial.name
    ])
  })

  it('Should return nothing when no transporter matches', () => {
    expect(matchingTransporters(records, 'no such transporter')).toEqual([])
  })

  // A private transporter has no approval number, so its haystack must not
  // fall over on the missing field.
  it('Should search a record that has no approval number', () => {
    expect(names(matchingTransporters(records, 'Harbour Road'))).toEqual([
      privateRecord.name
    ])
  })
})
