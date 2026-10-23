import { SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'
import { leaves } from '../../../../../../../shared/copy-leaves.js'

import {
  driveHandler,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import * as importReasonPurpose from '../../../../../../../services/import-reason-purpose/index.js'
import * as countries from '../../../../../../../services/countries/index.js'
import * as ports from '../../../../../../../services/ports/index.js'
import { dispatchPages } from '../../index.js'

import * as importReason from '../controller.js'
import { copy } from './copy.en.js'
import { copy as copyCy } from './copy.cy.js'
import { copy as sharedEn } from '../../../../../../../shared/copy.en.js'
import { copy as sharedCy } from '../../../../../../../shared/copy.cy.js'

const SELECT_ONE = 'Select one'
const SELECT_ONE_CY = 'Dewiswch un'

describe('import-reason copy module', () => {
  it('Should have a non-empty string at every leaf', () => {
    leaves(copy).forEach(({ path, value }) => {
      expect(typeof value, `${path} must be a string`).toBe('string')
      expect(value.trim().length, `${path} must not be empty`).toBeGreaterThan(
        0
      )
    })
  })

  it('Should carry a hint for every service reason option', () => {
    for (const option of importReasonPurpose.reasons()) {
      expect(copy.reasonHints[option.value]).toBeTruthy()
    }
  })

  it('Should carry a hint for every service purpose option the internal-market reveal asks', () => {
    for (const option of importReasonPurpose.purposes()) {
      expect(copy.purpose.hints[option.value]).toBeTruthy()
    }
  })

  it('Should close every internal-market purpose hint with a full stop', () => {
    for (const [value, hint] of Object.entries(copy.purpose.hints)) {
      expect(hint.endsWith('.'), `${value} must end in a full stop`).toBe(true)
    }
    for (const [value, hint] of Object.entries(copyCy.purpose.hints)) {
      expect(hint.endsWith('.'), `${value} must end in a full stop`).toBe(true)
    }
  })

  it('Should label each search and word its select text, search placeholder and no-results message', () => {
    expect(copy.country).toEqual({
      label: 'Destination country',
      selectText: SELECT_ONE,
      searchPlaceholder: SELECT_ONE,
      noResults: 'No countries found'
    })
    expect(copy.port).toEqual({
      label: 'Port of exit',
      selectText: SELECT_ONE,
      searchPlaceholder: SELECT_ONE,
      noResults: 'No ports found'
    })
    expect(copyCy.country).toEqual({
      label: 'Gwlad gyrchfan',
      selectText: SELECT_ONE_CY,
      searchPlaceholder: SELECT_ONE_CY,
      noResults: 'Dim gwledydd wedi’u darganfod'
    })
    expect(copyCy.port).toEqual({
      label: 'Porthladd ymadael',
      selectText: SELECT_ONE_CY,
      searchPlaceholder: SELECT_ONE_CY,
      noResults: 'Dim porthladdoedd wedi’u darganfod'
    })
  })

  it('Should title the page in English and Welsh', () => {
    expect(copy.title).toBe('Main import reason')
    expect(copyCy.title).toBe('Prif reswm mewnforio')
  })

  it('Should hint the exit date with the shared date example alone', () => {
    expect(copy.date.hint).toBe(sharedEn.dateExample)
    expect(copyCy.date.hint).toBe(sharedCy.dateExample)
  })

  it('Should ask for a destination country and a port of exit', () => {
    expect(copy.errors.countryRequired).toBe('Select a destination country')
    expect(copy.errors.portRequired).toBe('Select a port of exit')
    expect(copyCy.errors.countryRequired).toBe('Dewiswch wlad gyrchfan')
    expect(copyCy.errors.portRequired).toBe('Dewiswch borthladd ymadael')
  })

  it('Should report an unreadable exit date without naming the field again', () => {
    expect(copy.errors.dateInvalid).toBe('Enter a real date')
    expect(copyCy.errors.dateInvalid).toBe('Rhowch ddyddiad go iawn')
  })
})

describe('GET import-reason — copy reaches the view', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should supply the feature copy module and hint every option from it', async () => {
    const get = importReason.routes.find(
      (route) => route.method === 'GET'
    ).handler
    const result = await driveHandler(get)
    expect(result.view.context.copy).toBe(copy)
    expect(result.view.context.pageTitle).toBe(copy.title)
    for (const option of result.view.context.reasonOptions) {
      expect(option.hint.text).toBe(copy.reasonHints[option.value])
    }
    for (const option of result.view.context.purposeOptions) {
      expect(option.hint.text).toBe(copy.purpose.hints[option.value])
    }
  })

  it('Should start each list with an empty Select one option followed directly by the served places or ports', async () => {
    const get = importReason.routes.find(
      (route) => route.method === 'GET'
    ).handler
    const { countryItems, portItems } = (await driveHandler(get)).view.context

    expect(countryItems[0]).toEqual({ value: '', text: SELECT_ONE })
    expect(countryItems.slice(1)).toEqual(
      await countries.countryAndSubdivisionOptionsNamedWithCountry()
    )
    expect(portItems[0]).toEqual({ value: '', text: SELECT_ONE })
    expect(portItems.slice(1)).toEqual(await ports.portOptions())
  })

  it('Should carry the exit-date label into the view', async () => {
    const get = importReason.routes.find(
      (route) => route.method === 'GET'
    ).handler
    const { exitDateField } = (await driveHandler(get)).view.context

    expect(exitDateField.label.text).toBe(copy.date.label)
  })
})
