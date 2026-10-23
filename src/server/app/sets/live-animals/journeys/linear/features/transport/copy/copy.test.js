import { SET_ID } from '../../../../../set.js'
import { describe, expect, test } from 'vitest'

import { leaves } from '../../../../../../../shared/copy-leaves.js'
import {
  driveHandler,
  sampleText,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'

import * as portOfEntry from '../port-of-entry/port-of-entry.controller.js'
import * as transporters from '../transporters/transporters.controller.js'
import { copy } from './copy.en.js'
import { copy as copyCy } from './copy.cy.js'
import { copy as sharedEn } from '../../../../../../../shared/copy.en.js'
import { copy as sharedCy } from '../../../../../../../shared/copy.cy.js'

const SAMPLE_ADDRESS = '1 Farm Lane, Kent'
const SAMPLE_APPROVAL_NUMBER = 'GB-01'

describe('transport copy module', () => {
  test('Should have a non-empty string (or string-returning function) at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      const text = sampleText(value, ['sample', 'sample'])
      expect(typeof text, `${path} must resolve to a string`).toBe('string')
      expect(text.trim().length, `${path} must not be empty`).toBeGreaterThan(0)
    }
  })

  test('Should interpolate transitCountries.errors.maxCountries', () => {
    expect(copy.transitCountries.errors.maxCountries(12)).toBe(
      'Select up to 12 countries'
    )
  })

  test('Should interpolate transitCountries.limitReached with the cap', () => {
    expect(copy.transitCountries.limitReached(12)).toBe(
      'Maximum of 12 countries reached. Remove a country to add another.'
    )
  })

  test.each([
    {
      language: 'English',
      bundle: copy,
      one: '1 transporter shown',
      several: '3 transporters shown'
    },
    {
      language: 'Welsh',
      bundle: copyCy,
      one: '1 cludwr wedi’i ddangos',
      several: '3 cludwr wedi’u dangos'
    }
  ])(
    'Should word the number of transporters shown for one and for several in $language',
    ({ bundle, one, several }) => {
      expect(bundle.transporters.shownCount(1)).toBe(one)
      expect(bundle.transporters.shownCount(3)).toBe(several)
    }
  )

  test('Should interpolate transitCountries.added, removed and alreadyAdded with the country', () => {
    expect(copy.transitCountries.added('France')).toBe('France added.')
    expect(copy.transitCountries.removed('France')).toBe('France removed.')
    expect(copy.transitCountries.errors.alreadyAdded('France')).toBe(
      'You have already added France'
    )
  })

  test.each([
    {
      language: 'English',
      bundle: copy,
      expected:
        'The expected date of arrival at the port of entry. For example, 27/3/2026'
    },
    {
      language: 'Welsh',
      bundle: copyCy,
      expected:
        'Y dyddiad cyrraedd disgwyliedig yn y porthladd mynediad. Er enghraifft, 27/3/2026'
    }
  ])(
    'Should word the arrival date hint exactly in $language',
    ({ bundle, expected }) => {
      expect(bundle.portOfEntry.arrivalDate.hint).toBe(expected)
    }
  )

  test.each([
    {
      language: 'English',
      bundle: copy,
      expected:
        'Select where the transporter will enter with the consignment. Start typing to search by port or airport name or code.'
    },
    {
      language: 'Welsh',
      bundle: copyCy,
      expected:
        'Dewiswch ble bydd y cludwr yn dod i mewn gyda’r llwyth. Dechreuwch deipio i chwilio yn ôl enw neu god y porthladd neu’r maes awyr.'
    }
  ])(
    'Should word the port hint exactly in $language',
    ({ bundle, expected }) => {
      expect(bundle.portOfEntry.port.hint).toBe(expected)
    }
  )

  test.each([
    { language: 'English', bundle: copy, expected: 'Select a port' },
    { language: 'Welsh', bundle: copyCy, expected: 'Dewiswch borthladd' }
  ])(
    'Should word the port select text and search placeholder exactly in $language',
    ({ bundle, expected }) => {
      expect({
        selectText: bundle.portOfEntry.port.selectText,
        searchPlaceholder: bundle.portOfEntry.port.searchPlaceholder
      }).toEqual({ selectText: expected, searchPlaceholder: expected })
    }
  )

  test.each([
    {
      language: 'English',
      bundle: copy,
      expected: {
        selectText: 'Select a country',
        searchPlaceholder: 'Search for a country'
      }
    },
    {
      language: 'Welsh',
      bundle: copyCy,
      expected: {
        selectText: 'Dewiswch wlad',
        searchPlaceholder: 'Chwiliwch am wlad'
      }
    }
  ])(
    'Should word the transit countries select text and search placeholder exactly in $language',
    ({ bundle, expected }) => {
      expect({
        selectText: bundle.transitCountries.country.selectText,
        searchPlaceholder: bundle.transitCountries.country.searchPlaceholder
      }).toEqual(expected)
    }
  )

  test.each([
    {
      language: 'English',
      bundle: copy,
      expected: {
        AIRPLANE: 'Air',
        RAILWAY: 'Rail',
        ROAD_VEHICLE: 'Road',
        VESSEL: 'Sea'
      }
    },
    {
      language: 'Welsh',
      bundle: copyCy,
      expected: {
        AIRPLANE: 'Awyr',
        RAILWAY: 'Rheilffordd',
        ROAD_VEHICLE: 'Ffordd',
        VESSEL: 'Môr'
      }
    }
  ])(
    'Should label the means of transport options exactly in $language',
    ({ bundle, expected }) => {
      expect(bundle.portOfEntry.means.options).toEqual(expected)
    }
  )

  test.each([
    {
      language: 'English',
      bundle: copy,
      expected: 'Enter one of the following:'
    },
    {
      language: 'Welsh',
      bundle: copyCy,
      expected: 'Rhowch un o’r canlynol:'
    }
  ])(
    'Should word the identification lead-in exactly in $language',
    ({ bundle, expected }) => {
      expect(bundle.portOfEntry.identification.hint.lead).toBe(expected)
    }
  )

  test('Should end the arrival date hint with the shared date example in both languages', () => {
    expect(
      copy.portOfEntry.arrivalDate.hint.endsWith(sharedEn.dateExample)
    ).toBe(true)
    expect(
      copyCy.portOfEntry.arrivalDate.hint.endsWith(sharedCy.dateExample)
    ).toBe(true)
  })

  test('Should interpolate portOfEntry.errors.arrivalDateOutOfRange', () => {
    expect(
      copy.portOfEntry.errors.arrivalDateOutOfRange('5/8/2026', '12/2/2027')
    ).toBe(
      'Arrival date at port of entry must be between 5/8/2026 and 12/2/2027'
    )
  })
})

describe('transport copy module — transporter pages', () => {
  test('Should interpolate transportersSelect.optionHint', () => {
    expect(
      copy.transportersSelect.optionHint(SAMPLE_ADDRESS, SAMPLE_APPROVAL_NUMBER)
    ).toBe('1 Farm Lane, Kent — approval number GB-01')
  })

  test('Should head every column of the transporter list in English and Welsh', () => {
    expect(copy.transporters.table).toEqual({
      selectHidden: 'Select',
      name: 'Name',
      address: 'Address',
      approvalNumber: 'Approval number',
      type: 'Type',
      status: 'Status'
    })
    expect(copyCy.transporters.table).toEqual({
      selectHidden: 'Dewis',
      name: 'Enw',
      address: 'Cyfeiriad',
      approvalNumber: 'Rhif cymeradwyo',
      type: 'Math',
      status: 'Statws'
    })
    expect(copy.transporters.selectRowPrefix).toBe('Select')
    expect(copyCy.transporters.selectRowPrefix).toBe('Dewis')
  })

  test('Should name both approval statuses in both languages', () => {
    expect(copy.transporters.statuses).toEqual({
      Approved: 'Approved',
      New: 'New'
    })
    expect(copyCy.transporters.statuses).toEqual({
      Approved: 'Cymeradwywyd',
      New: 'Newydd'
    })
  })

  test('Should name the three facts the transporter search matches, in both languages', () => {
    expect(copy.transporters.search).toEqual({
      label: 'Search',
      hint: 'Name, address or approval number',
      button: 'Search'
    })
    expect(copyCy.transporters.search).toEqual({
      label: 'Chwilio',
      hint: 'Enw, cyfeiriad neu rif cymeradwyo',
      button: 'Chwilio'
    })
    expect(copy.transporters.noMatches).toBe(
      'No transporters match your search.'
    )
    expect(copyCy.transporters.noMatches).toBe(
      'Nid oes unrhyw gludwyr yn cyfateb i’ch chwiliad.'
    )
  })

  test('Should head the type question with the choice and leave the private option unhinted', () => {
    expect(copy.transporterAdd.title).toBe('Choose a transporter type')
    expect(copy.transporterAdd.warning).toBe(
      'Before you add this transporter, please ensure you have already searched for it first.'
    )
    for (const deck of [copy, copyCy]) {
      expect(Object.keys(deck.transporterAdd)).toEqual([
        'title',
        'legend',
        'warning',
        'options'
      ])
    }
    expect(copy.transporterAdd.options.Private).toEqual({
      text: 'Private transporter'
    })
    expect(copy.transporterAdd.options.Commercial.hint).toBe(
      'This can only be a commercial transporter from Northern Ireland.'
    )
  })

  test('Should head the private form as an addition', () => {
    expect(copy.privateTransporterDetails.title).toBe('Add private transporter')
    expect(copyCy.privateTransporterDetails.title).toBe(
      'Ychwanegu cludwr preifat'
    )
  })

  test('Should head the private form’s contact details in both languages', () => {
    expect(copy.privateTransporterDetails.contactHeading).toBe(
      'Enter contact details'
    )
    expect(copyCy.privateTransporterDetails.contactHeading).toBe(
      'Rhowch fanylion cyswllt'
    )
  })

  test('Should ask the private form for a phone number and hint the country code', () => {
    expect(copy.privateTransporterDetails.fields.phone).toBe('Phone number')
    expect(copy.privateTransporterDetails.telephoneHint).toBe(
      'For international numbers include the country code'
    )
    expect(copy.privateTransporterDetails.errors.telephoneRequired).toBe(
      'Enter a phone number'
    )
    expect(copy.privateTransporterDetails.errors.telephoneMaxLength).toBe(
      'Phone number must be 20 characters or less'
    )
  })

  test('Should label the private form’s postcode field and name it the same way in both its errors', () => {
    expect(copy.privateTransporterDetails.fields.postcode).toBe(
      'Postcode or Zip code'
    )
    expect(copy.privateTransporterDetails.errors.postcodeRequired).toBe(
      'Enter a postcode or Zip code'
    )
    expect(copy.privateTransporterDetails.errors.postcodeMaxLength).toBe(
      'Postcode or Zip code must be 12 characters or less'
    )
  })

  test('Should head the commercial form as an addition and fix its country', () => {
    expect(copy.commercialTransporterDetails.title).toBe(
      'Add commercial transporter'
    )
    expect(copyCy.commercialTransporterDetails.title).toBe(
      'Ychwanegu cludwr masnachol'
    )
    expect(copy.commercialTransporterDetails.fields.approvalNumber).toBe(
      'Transporter authorisation number'
    )
    expect(copy.commercialTransporterDetails.country).toBe('Northern Ireland')
    expect(copyCy.commercialTransporterDetails.country).toBe('Gogledd Iwerddon')
  })

  test('Should head the commercial form guidance banner and hint the phone number', () => {
    expect(copy.commercialTransporterDetails.guidanceTitle).toBe(
      'Help with transporter authorisation'
    )
    expect(copy.commercialTransporterDetails.contactHeading).toBe(
      'Enter contact details'
    )
    expect(copy.commercialTransporterDetails.telephoneHint).toBe(
      'For international numbers include the country code'
    )
  })

  test('Should link the same guidance section in Welsh as in English', () => {
    expect(copyCy.transporters.guidance.linkHref).toBe(
      copy.transporters.guidance.linkHref
    )
  })

  test('Should carry the Welsh transporters.guidance.euNotValid sentence', () => {
    expect(copyCy.transporters.guidance.euNotValid).toBe(
      'Nid yw dogfennau a roddwyd mewn unrhyw aelod-wladwriaeth yr UE yn ddilys i’w defnyddio yn GB.'
    )
  })
})

describe('GET /port-of-entry', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  test('Should supply the page copy namespace and the shared chrome copy', async () => {
    const get = portOfEntry.routes.find(
      (route) => route.method === 'GET'
    ).handler
    const result = await driveHandler(get)
    expect(result.view.context.copy).toBe(copy.portOfEntry)
    expect(result.view.context.pageTitle).toBe(copy.portOfEntry.title)
    expect(result.view.context.sharedCopy.saveActions.saveAndContinue).toBe(
      'Save and continue'
    )
    expect(result.view.context.portItems[0].text).toBe(
      copy.portOfEntry.port.selectText
    )
    expect(result.view.context.meansItems[0].text).toBe(
      copy.portOfEntry.means.selectText
    )
    expect(result.view.context.arrivalDate.label.text).toBe(
      copy.portOfEntry.arrivalDate.label
    )
    expect(result.view.context.arrivalDate.hint.text).toBe(
      copy.portOfEntry.arrivalDate.hint
    )
  })
})

describe('GET /transporters', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  test('Should carry the transporter-authorisation guidance in the view model', async () => {
    const get = transporters.routes.find(
      (route) => route.method === 'GET'
    ).handler
    const result = await driveHandler(get)
    const guidance = result.view.context.copy.guidance

    expect(guidance.authorisationLead).toBe(
      copy.transporters.guidance.authorisationLead
    )
    expect(guidance.authorisationConditions).toContain(
      'travelling on journeys of over 65 km'
    )
    expect(guidance.linkText).toBe(
      'Find out how to transport animals in connection with an economic activity (opens in a new tab)'
    )
    expect(guidance.linkHref).toBe(
      'https://www.gov.uk/guidance/animal-welfare-in-transport#transporting-animals-in-connection-with-an-economic-activity'
    )
    expect(guidance.daeraValid).toBe(
      'Documents issued by DAERA are valid for use in GB.'
    )
    expect(guidance.euNotValid).toBe(
      'Documents issued in any EU member state are not valid for use in GB.'
    )
  })
})
