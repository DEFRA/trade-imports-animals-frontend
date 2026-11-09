import { describe, expect, it } from 'vitest'

import {
  APPROVED,
  COMMERCIAL,
  NEW,
  PRIVATE
} from '../../../../../../../services/transporters/index.js'
import {
  matchingTransporters,
  shownCountMessages,
  transporterRows,
  transporterTableRows
} from './rows.js'

const COMMERCIAL_APPROVAL_NUMBER = 'ES-T2-45001294'
const NOT_APPLICABLE = 'Not applicable'

const commercial = {
  id: 'garcia-livestock-transport',
  type: COMMERCIAL,
  status: APPROVED,
  name: 'García Livestock Transport SL',
  approvalNumber: COMMERCIAL_APPROVAL_NUMBER,
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
    postcode: 'AB11 5DQ',
    country: 'United Kingdom'
  }
}

const newPrivateRecord = {
  id: 'dunmore-haulage',
  type: PRIVATE,
  status: NEW,
  name: 'Dunmore Haulage',
  address: {
    addressLine1: '3 Mill Lane',
    townOrCity: 'Dunmore',
    country: 'Ireland'
  }
}

const addedRecord = {
  id: '64b2f1a9c3d4e5f6a7b8c9d0',
  type: PRIVATE,
  status: NEW,
  fromAddressBook: true,
  name: 'Jean Dupont',
  address: {
    addressLine1: '10 Rue de la Ferme',
    townOrCity: 'Calais',
    country: 'France'
  }
}

const records = [commercial, privateRecord]

const RETURN_URL =
  'http://animals.example/live-animals/notifications/abc/transporters'

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

  it('Should match on the type word', () => {
    const everyRecord = [...records, newPrivateRecord]

    expect(names(matchingTransporters(everyRecord, 'Private'))).toEqual([
      privateRecord.name,
      newPrivateRecord.name
    ])
    expect(names(matchingTransporters(everyRecord, 'commercial'))).toEqual([
      commercial.name
    ])
  })

  it('Should match on the status word', () => {
    const everyRecord = [...records, newPrivateRecord]

    expect(names(matchingTransporters(everyRecord, 'New'))).toEqual([
      newPrivateRecord.name
    ])
    expect(names(matchingTransporters(everyRecord, 'approved'))).toEqual([
      commercial.name,
      privateRecord.name
    ])
  })

  it('Should keep every match, in the order the list holds them', () => {
    expect(names(matchingTransporters(records, 'livestock'))).toEqual([
      commercial.name,
      privateRecord.name
    ])
  })

  it('Should match a term spanning two of the facts it searches', () => {
    expect(names(matchingTransporters(records, 'switzerland es-t2'))).toEqual([
      commercial.name
    ])
  })

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

  it('Should search a record that has no approval number', () => {
    expect(names(matchingTransporters(records, 'Harbour Road'))).toEqual([
      privateRecord.name
    ])
  })

  it('Should match transporters with no approval number by the label shown in that column, and leave a real approval number matching only its own record', () => {
    const everyRecord = [...records, newPrivateRecord]

    expect(names(matchingTransporters(everyRecord, NOT_APPLICABLE))).toEqual([
      privateRecord.name,
      newPrivateRecord.name
    ])
    expect(names(matchingTransporters(everyRecord, 'es-t2-45001294'))).toEqual([
      commercial.name
    ])
  })
})

describe('#transporterRows', () => {
  it('Should carry the text each row is searched on: name, address, approval number, type word and status word', () => {
    const [row] = transporterRows([commercial], { selectedId: null })

    expect(row.searchText).toBe(
      'García Livestock Transport SL 43 East Hague Extension, Switzerland ES-T2-45001294 Commercial Approved'
    )
  })

  it('Should carry the Not applicable label in the search text of a record without an approval number', () => {
    const [row] = transporterRows([newPrivateRecord], {
      selectedId: null
    })

    expect(row.searchText).toBe(
      'Dunmore Haulage 3 Mill Lane, Dunmore, Ireland Not applicable Private New'
    )
  })

  it('Should show the record’s own approval number in its column, and the Not applicable label for a record with none', () => {
    const [withNumber] = transporterRows([commercial], { selectedId: null })
    const [withoutNumber] = transporterRows([newPrivateRecord], {
      selectedId: null
    })

    expect(withNumber.approvalNumberText).toBe(COMMERCIAL_APPROVAL_NUMBER)
    expect(withoutNumber.approvalNumberText).toBe(NOT_APPLICABLE)
  })
})

describe('#shownCountMessages', () => {
  it('Should give one message per possible count of rows shown, in the singular then the plural', () => {
    expect(shownCountMessages(3)).toEqual([
      '1 transporter shown',
      '2 transporters shown',
      '3 transporters shown'
    ])
  })

  it('Should give no messages for an empty list', () => {
    expect(shownCountMessages(0)).toEqual([])
  })
})

describe('#transporterTableRows', () => {
  it('Should give each transporter a select radio, its plain facts and a status tag', () => {
    const [cells] = transporterTableRows(
      transporterRows([commercial], { selectedId: commercial.id }),
      { returnUrl: RETURN_URL }
    )
    const [selectCell, name, address, approvalNumberCell, type, statusCell] =
      cells

    expect(selectCell.attributes).toEqual({
      'data-search-text':
        'García Livestock Transport SL 43 East Hague Extension, Switzerland ES-T2-45001294 Commercial Approved'
    })
    expect(selectCell.html).toContain('type="radio"')
    expect(selectCell.html).toContain('value="garcia-livestock-transport"')
    expect(selectCell.html).toContain('checked')
    expect(selectCell.html).toContain('Select García Livestock Transport SL')
    expect([name, address, approvalNumberCell, type]).toEqual([
      {
        text: 'García Livestock Transport SL',
        attributes: { 'data-search-words': '' }
      },
      {
        text: '43 East Hague Extension, Switzerland',
        attributes: { 'data-search-words': '' }
      },
      {
        text: COMMERCIAL_APPROVAL_NUMBER,
        attributes: { 'data-search-words': '' }
      },
      { text: 'Commercial', attributes: { 'data-search-words': '' } }
    ])
    expect(statusCell.html).toContain('govuk-tag--green')
    expect(statusCell.html).toContain('Approved')
    expect(statusCell.attributes).toEqual({ 'data-search-words': '' })
  })

  it('Should leave the radio unchecked for a transporter that is not the selected one', () => {
    const [[selectCell]] = transporterTableRows(
      transporterRows([privateRecord], { selectedId: commercial.id }),
      { returnUrl: RETURN_URL }
    )

    expect(selectCell.html).not.toContain('checked')
  })

  it('Should show the Not applicable label in the approval-number cell for a record with no approval number', () => {
    const [[, , , approvalNumberCell]] = transporterTableRows(
      transporterRows([newPrivateRecord], { selectedId: null }),
      { returnUrl: RETURN_URL }
    )

    expect(approvalNumberCell).toEqual({
      text: NOT_APPLICABLE,
      attributes: { 'data-search-words': '' }
    })
  })

  it('Should give an added record’s row a details link to the address book, carrying the id and the given return URL', () => {
    const [[, , , , , , detailsCell]] = transporterTableRows(
      transporterRows([addedRecord], { selectedId: null }),
      { returnUrl: RETURN_URL }
    )

    expect(detailsCell.html).toContain(
      `/address-book/${addedRecord.id}?return=${encodeURIComponent(RETURN_URL)}`
    )
    expect(detailsCell.html).toContain('View details')
    expect(detailsCell.html).toContain(
      `<span class="govuk-visually-hidden"> ${addedRecord.name}</span>`
    )
    expect(detailsCell.attributes).toBeUndefined()
  })

  it('Should leave the details cell empty for a shipped record the address book holds no document for', () => {
    const [[, , , , , , detailsCell]] = transporterTableRows(
      transporterRows([privateRecord], { selectedId: null }),
      { returnUrl: RETURN_URL }
    )

    expect(detailsCell).toEqual({})
  })
})
