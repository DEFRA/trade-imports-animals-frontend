import { SET_ID } from '../../../../../set.js'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  driveHandler,
  expectOneRefusalLogged,
  postHandlerOf,
  referenceDataServing,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'
import { hubPath } from '../../../../../../../shared/paths.js'
import * as ports from '../../../../../../../services/ports/index.js'
import {
  addUtcDays,
  formatDateText
} from '../../../../../../../lib/validate/calendar.js'

import { copy } from '../copy/copy.en.js'
import { arrivalWindow } from './arrival-window.js'
import * as portOfEntry from './port-of-entry.controller.js'

const post = postHandlerOf(portOfEntry)
const get = portOfEntry.routes.find((route) => route.method === 'GET').handler

const oneOfError = 'Select a valid option'

describe('POST port-of-entry — port membership', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should re-render an out-of-list port with an error and commit nothing', async () => {
    const result = await driveHandler(post, {
      payload: { portOfEntry: 'XX NOPE' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.portOfEntry).toBe(oneOfError)
    expect(result.after).toEqual(result.before)
    expectOneRefusalLogged(result.logger, {
      journeyId: result.journeyId,
      errorCodes: ['portOfEntry']
    })
  })
})

describe('POST port-of-entry — means of transport on the merged page', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should re-render an out-of-list means with an error and commit nothing', async () => {
    const result = await driveHandler(post, {
      payload: { meansOfTransport: 'Hovercraft' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.meansOfTransport).toBe(oneOfError)
    expect(result.after).toEqual(result.before)
  })

  it('Should wipe the transited countries when the means changes off the overland set', async () => {
    const result = await driveHandler(post, {
      seed: {
        meansOfTransport: 'ROAD_VEHICLE',
        transitedCountries: ['FR', 'BE']
      },
      payload: { meansOfTransport: 'AIRPLANE' }
    })
    expect(result.after.meansOfTransport).toBe('AIRPLANE')
    expect(result.after.transitedCountries).toBeUndefined()
  })

  it('Should keep the transited countries while the means stays overland', async () => {
    const result = await driveHandler(post, {
      seed: {
        meansOfTransport: 'ROAD_VEHICLE',
        transitedCountries: ['FR', 'BE']
      },
      payload: { meansOfTransport: 'RAILWAY' }
    })
    expect(result.after.transitedCountries).toEqual(['FR', 'BE'])
  })
})

describe('GET port-of-entry — server-rendered select data (no-JS path)', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should supply an empty-value select text followed by name-plus-code options (no divider)', async () => {
    const result = await driveHandler(get)
    const items = result.view.context.portItems
    expect(items[0]).toEqual({ value: '', text: 'Select a port' })
    const [firstPort] = await ports.list()
    expect(items[1]).toEqual({
      value: firstPort.code,
      text: `${firstPort.name} - ${firstPort.code}`,
      selected: false
    })
    expect(items).toContainEqual({
      value: 'GB ABD',
      text: 'Aberdeen Harbour - GB ABD',
      selected: false
    })
  })

  it('Should supply the means of transport as select text followed by every reference code, none selected', async () => {
    const result = await driveHandler(get)
    expect(result.view.context.meansItems).toEqual([
      { value: '', text: 'Select one' },
      { value: 'AIRPLANE', text: 'Air', selected: false },
      { value: 'RAILWAY', text: 'Rail', selected: false },
      { value: 'ROAD_VEHICLE', text: 'Road', selected: false },
      { value: 'VESSEL', text: 'Sea', selected: false }
    ])
  })

  it('Should mark the saved means of transport as the selected option', async () => {
    const result = await driveHandler(get, {
      seed: { meansOfTransport: 'VESSEL' }
    })
    const selected = result.view.context.meansItems.filter(
      (item) => item.selected
    )
    expect(selected).toEqual([{ value: 'VESSEL', text: 'Sea', selected: true }])
  })

  it('Should set the arrival date label in the medium GOV.UK label size', async () => {
    const result = await driveHandler(get)
    expect(result.view.context.arrivalDate.label.classes).toBe('govuk-label--m')
    expect(result.view.context.questionLabelClasses).toBe('govuk-label--m')
  })

  it.each([
    ['AIRPLANE', 'Air'],
    ['RAILWAY', 'Rail'],
    ['ROAD_VEHICLE', 'Road'],
    ['VESSEL', 'Sea']
  ])(
    'Should store %s when the user chooses %s, and offer it under that label',
    async (code, label) => {
      const saved = await driveHandler(post, {
        payload: { meansOfTransport: code }
      })
      expect(saved.after.meansOfTransport).toBe(code)

      const shown = await driveHandler(get, {
        seed: { meansOfTransport: code }
      })
      expect(
        shown.view.context.meansItems.filter((item) => item.selected)
      ).toEqual([{ value: code, text: label, selected: true }])
    }
  )
})

describe('port-of-entry — the arrival-date window', () => {
  const now = new Date('2026-08-12T09:00:00Z')
  const dateWindow = arrivalWindow(now)
  const outOfRangeError = copy.portOfEntry.errors.arrivalDateOutOfRange(
    dateWindow.minText,
    dateWindow.maxText
  )
  const dayOutside = (bound, days) =>
    formatDateText(addUtcDays(dateWindow[bound], days))

  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(now)
  })
  useStubbedJourney(SET_ID, dispatchPages)
  afterAll(() => vi.useRealTimers())

  it('Should hand the picker the window bounds', async () => {
    const result = await driveHandler(get)

    expect(result.view.context.arrivalDate.minDate).toBe(dateWindow.minText)
    expect(result.view.context.arrivalDate.maxDate).toBe(dateWindow.maxText)
  })

  it.each([
    ['a day before the earliest allowed date', dayOutside('min', -1)],
    ['a day after the latest allowed date', dayOutside('max', 1)]
  ])('Should reject %s and commit nothing', async (_label, value) => {
    const result = await driveHandler(post, {
      payload: { arrivalDateAtPort: value }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.arrivalDateAtPort).toBe(outOfRangeError)
    expect(result.after).toEqual(result.before)
    expect(result.view.context.arrivalDate.minDate).toBe(dateWindow.minText)
    expect(result.view.context.arrivalDate.maxDate).toBe(dateWindow.maxText)
  })

  it.each([
    ['the earliest allowed date', 'min'],
    ['the latest allowed date', 'max']
  ])('Should accept and commit %s', async (_label, bound) => {
    const result = await driveHandler(post, {
      payload: { arrivalDateAtPort: formatDateText(dateWindow[bound]) }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.arrivalDateAtPort).toEqual({
      day: String(dateWindow[bound].getUTCDate()),
      month: String(dateWindow[bound].getUTCMonth() + 1),
      year: String(dateWindow[bound].getUTCFullYear())
    })
  })

  it('Should keep the real-date message for a calendar-impossible date', async () => {
    const result = await driveHandler(post, {
      payload: { arrivalDateAtPort: '31/2/2026' }
    })

    expect(result.view.context.errors.arrivalDateAtPort).toBe(
      copy.portOfEntry.errors.arrivalDateInvalid
    )
  })

  it('Should keep the real-date message on Save and return to overview, saving nothing', async () => {
    const result = await driveHandler(post, {
      payload: { arrivalDateAtPort: '31/2/2026', exit: 'hub' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.arrivalDateAtPort).toBe(
      copy.portOfEntry.errors.arrivalDateInvalid
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should save an empty page and go to the overview on Save and return to overview', async () => {
    const result = await driveHandler(post, { payload: { exit: 'hub' } })

    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
  })

  it('Should leave a blank arrival date optional', async () => {
    const result = await driveHandler(post, {
      payload: { arrivalDateAtPort: '' }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.arrivalDateAtPort).toEqual({
      day: '',
      month: '',
      year: ''
    })
  })
})

describe('GET port-of-entry — a stored port the reader no longer offers', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should blank the port in values so the select renders unselected, without adding the stale option', async () => {
    const result = await driveHandler(get, {
      seed: { portOfEntry: 'GB ZZZ' }
    })

    expect(result.view.context.values.portOfEntry).toBe('')
    expect(
      result.view.context.portItems.find((item) => item.value === 'GB ZZZ')
    ).toBeUndefined()
  })

  it('Should surface a port-no-longer-available error on the port field', async () => {
    const result = await driveHandler(get, {
      seed: { portOfEntry: 'GB ZZZ' }
    })

    expect(result.view.context.errors.portOfEntry).toBe(
      copy.portOfEntry.errors.portNoLongerAvailable
    )
  })

  it('Should leave the stored port intact', async () => {
    const result = await driveHandler(get, {
      seed: { portOfEntry: 'GB ZZZ' }
    })

    expect(result.before.portOfEntry).toBe('GB ZZZ')
    expect(result.after.portOfEntry).toBe('GB ZZZ')
  })
})

describe('POST port-of-entry — empty port overwrites a stored answer', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should replace a previously stored port with an empty string when the select text is submitted', async () => {
    const result = await driveHandler(post, {
      seed: { portOfEntry: 'GB DVR' },
      payload: {
        portOfEntry: '',
        meansOfTransport: 'VESSEL'
      }
    })

    expect(result.view).toBeUndefined()
    expect(result.before.portOfEntry).toBe('GB DVR')
    expect(result.after.portOfEntry).toBe('')
  })
})

describe('POST port-of-entry — port membership follows the primed list', () => {
  const serveReferenceData = referenceDataServing()

  useStubbedJourney(SET_ID, dispatchPages)

  it('Should validate against the list as primed at POST time', async () => {
    serveReferenceData([{ code: 'ZZ 001', name: 'Zedport' }])
    await ports.ensureLoaded()

    const accepted = await driveHandler(post, {
      payload: { portOfEntry: 'ZZ 001' }
    })
    expect(accepted.view).toBeUndefined()
    expect(accepted.after.portOfEntry).toBe('ZZ 001')

    const rejected = await driveHandler(post, {
      payload: { portOfEntry: 'GB ABD' }
    })
    expect(rejected.view.context.errors.portOfEntry).toBe(oneOfError)
  })
})
