import { beforeAll, beforeEach, describe, expect, test } from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import { driveHandler } from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'

import { arrivalWindow } from '../port-of-entry/arrival-window.js'
import * as portOfEntry from '../port-of-entry/port-of-entry.controller.js'
import * as transporters from '../transporters/transporters.controller.js'
import { copy } from './copy.en.js'
import { copy as copyCy } from './copy.cy.js'

const SAMPLE_ADDRESS = '1 Farm Lane, Kent'
const SAMPLE_APPROVAL_NUMBER = 'GB-01'

const leaves = (node, path = []) =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, [...path, key])
      )
    : [{ path: path.join('.'), value: node }]

describe('transport copy module', () => {
  // Parameterised strings are copy FUNCTIONS: a leaf may be a function of
  // sample arguments returning the finished sentence.
  test('Should have a non-empty string (or string-returning function) at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      const text =
        typeof value === 'function' ? value('sample', 'sample') : value
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

  test('Should interpolate transitCountries.added, removed and alreadyAdded with the country', () => {
    expect(copy.transitCountries.added('France')).toBe('France added.')
    expect(copy.transitCountries.removed('France')).toBe('France removed.')
    expect(copy.transitCountries.errors.alreadyAdded('France')).toBe(
      'You have already added France'
    )
  })

  test('Should interpolate portOfEntry.arrivalDate.hint with the worked example', () => {
    expect(copy.portOfEntry.arrivalDate.hint('27/3/2026')).toBe(
      'The expected date of arrival at the port of entry. For example, 27/3/2026'
    )
  })

  test('Should keep the accepted window out of portOfEntry.arrivalDate.hint', () => {
    expect(copy.portOfEntry.arrivalDate.hint('27/3/2026')).not.toContain(
      'between'
    )
  })

  // The Welsh deck carries the same sentence and takes the same one argument.
  // Copy parity only checks the arity of a function leaf, never the sentence it
  // builds, so the Welsh hint is asserted here alongside the English one.
  test('Should interpolate the Welsh portOfEntry.arrivalDate.hint with the worked example', () => {
    expect(copyCy.portOfEntry.arrivalDate.hint('27/3/2026')).toBe(
      'Y dyddiad cyrraedd disgwyliedig yn y porthladd mynediad. Er enghraifft, 27/3/2026'
    )
  })

  test('Should interpolate portOfEntry.errors.arrivalDateOutOfRange', () => {
    expect(
      copy.portOfEntry.errors.arrivalDateOutOfRange('5/8/2026', '12/2/2027')
    ).toBe(
      'Arrival date at port of entry must be between 5/8/2026 and 12/2/2027'
    )
  })

  test('Should interpolate transportersSelect.optionHint', () => {
    expect(
      copy.transportersSelect.optionHint(SAMPLE_ADDRESS, SAMPLE_APPROVAL_NUMBER)
    ).toBe('1 Farm Lane, Kent — approval number GB-01')
  })

  test('Should interpolate transporters.optionHint', () => {
    expect(copy.transporters.optionHint('Commercial', SAMPLE_ADDRESS)).toBe(
      'Commercial — 1 Farm Lane, Kent'
    )
  })

  test('Should interpolate transporters.optionHintApproved', () => {
    expect(
      copy.transporters.optionHintApproved(
        'Commercial',
        SAMPLE_ADDRESS,
        SAMPLE_APPROVAL_NUMBER
      )
    ).toBe('Commercial — 1 Farm Lane, Kent — approval number GB-01')
  })

  // Both list hints take the same arguments in Welsh, and copy parity only
  // checks a function leaf's arity, so the Welsh sentences are asserted here
  // beside the English ones.
  test('Should interpolate the Welsh transporters.optionHint', () => {
    expect(
      copyCy.transporters.optionHint('Preifat', '12 Harbour Road, Aberdeen')
    ).toBe('Preifat — 12 Harbour Road, Aberdeen')
  })

  test('Should interpolate the Welsh transporters.optionHintApproved', () => {
    expect(
      copyCy.transporters.optionHintApproved(
        'Masnachol',
        'Rue de la Loi 200, Brussels',
        'UK/BURY/T2/00104115'
      )
    ).toBe(
      'Masnachol — Rue de la Loi 200, Brussels — rhif cymeradwyo UK/BURY/T2/00104115'
    )
  })

  // Design release 1 heads the type question with the choice, warns that
  // adding is a last resort, and explains only the commercial arm.
  test('Should head the type question with the choice and leave the private option unhinted', () => {
    expect(copy.transporterAdd.title).toBe('Choose a transporter type')
    expect(copy.transporterAdd.warning).toBe(
      'Before you add this transporter, please ensure you have already searched for it first.'
    )
    // Design release 1 warns instead of describing the next page, so the
    // journey-describing hint is gone from both decks.
    expect(copy.transporterAdd.hint).toBeUndefined()
    expect(copyCy.transporterAdd.hint).toBeUndefined()
    expect(copy.transporterAdd.options.Private).toEqual({
      text: 'Private transporter'
    })
    expect(copy.transporterAdd.options.Commercial.hint).toBe(
      'This can only be a commercial transporter from Northern Ireland.'
    )
  })

  // Design release 1 heads the private form as the addition it is, under the
  // same new-transporter caption as the type question.
  test('Should head the private form as an addition', () => {
    expect(copy.privateTransporterDetails.title).toBe('Add private transporter')
    expect(copyCy.privateTransporterDetails.title).toBe(
      'Ychwanegu cludwr preifat'
    )
  })

  // Design release 1 heads the commercial form as the addition it is, asks the
  // authorisation number first and fixes the country to Northern Ireland.
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

  // The banner repeats the authorisation rules the list states, and the phone
  // number carries the international hint (design release 1).
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

  // Both languages must send the trader to the same guidance section — a
  // divergent href here is a broken translation, not a wording choice.
  test('Should link the same guidance section in Welsh as in English', () => {
    expect(copyCy.transporters.guidance.linkHref).toBe(
      copy.transporters.guidance.linkHref
    )
  })

  // Copy parity only checks that a Welsh leaf differs from its English
  // counterpart, never the sentence itself, so the Welsh guidance sentence is
  // asserted here beside the English one.
  test('Should carry the Welsh transporters.guidance.euNotValid sentence', () => {
    expect(copyCy.transporters.guidance.euNotValid).toBe(
      'Nid yw dogfennau a roddwyd mewn unrhyw aelod-wladwriaeth yr UE yn ddilys i’w defnyddio yn GB.'
    )
  })
})

describe('GET /port-of-entry', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

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
      copy.portOfEntry.port.placeholder
    )
    expect(result.view.context.meansItems[0].text).toBe(
      copy.portOfEntry.means.placeholder
    )
    expect(result.view.context.arrivalDate.label.text).toBe(
      copy.portOfEntry.arrivalDate.label
    )
    const { exampleText } = arrivalWindow()
    expect(result.view.context.arrivalDate.hint.text).toBe(
      copy.portOfEntry.arrivalDate.hint(exampleText)
    )
  })
})

describe('GET /transporters', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

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
