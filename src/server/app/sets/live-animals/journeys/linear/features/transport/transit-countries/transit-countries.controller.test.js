import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  postHandlerOf
} from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'
import * as countries from '../../../../../../../services/countries/index.js'

import * as transitCountries from './transit-countries.controller.js'
import {
  COUNTRY_FIELD,
  MAX_TRANSITED_COUNTRIES
} from './transit-countries.controller.js'
import { REMOVE_ACTION_PREFIX } from './remove-action.js'

const get = transitCountries.routes.find(
  (route) => route.method === 'GET'
).handler
const post = postHandlerOf(transitCountries)

const codes = countries.originCountries().map((country) => country.value)
const atCapacity = codes.slice(0, MAX_TRANSITED_COUNTRIES)
const tooManyCodes = codes.slice(0, MAX_TRANSITED_COUNTRIES + 1)
const seed = { meansOfTransport: 'ROAD_VEHICLE' }
// The one message for a code the offered list does not contain, whichever
// guard raises it.
const FROM_LIST = 'Select countries from the list'

const configure = () => {
  configureRecords(recordsStub)
  configureSession(sessionStub)
  buildDispatch(dispatchPages)
}

describe('POST transit-countries — adding a country', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

  const refusals = [
    {
      name: 'nothing chosen in the search box',
      payload: { action: 'add', transitedCountries: ['FR'] },
      message: 'Enter a country to add'
    },
    {
      name: 'a country that is not in the list',
      payload: { action: 'add', transitedCountry: 'ZZ' },
      message: FROM_LIST
    },
    {
      name: 'a country that has already been added',
      payload: {
        action: 'add',
        transitedCountry: 'FR',
        transitedCountries: ['FR']
      },
      message: 'You have already added France'
    },
    {
      name: 'a thirteenth country',
      payload: {
        action: 'add',
        transitedCountry: codes[MAX_TRANSITED_COUNTRIES],
        transitedCountries: atCapacity
      },
      message: `Select up to ${MAX_TRANSITED_COUNTRIES} countries`
    }
  ]

  it.each(refusals)(
    'Should refuse $name, keep the search box on the page and commit nothing',
    async ({ payload, message }) => {
      const result = await driveHandler(post, { seed, payload })
      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.errors[COUNTRY_FIELD]).toBe(message)
      expect(result.view.context.showCountryField).toBe(true)
      expect(result.after).toEqual(result.before)
    }
  )

  it('Should put a refused country back into the search box', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: {
        action: 'add',
        transitedCountry: 'FR',
        transitedCountries: ['FR']
      }
    })
    expect(result.view.context.chosenValue).toBe('FR')
    expect(result.view.context.chosenLabel).toBe('France')
  })

  it('Should add the country to the working list, announce it and commit nothing', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: {
        action: 'add',
        transitedCountry: 'BE',
        transitedCountries: ['FR']
      }
    })
    expect(result.response.statusCode).toBe(200)
    expect(result.view.context.selectedCountries).toEqual(['FR', 'BE'])
    expect(result.view.context.countryRows.map((row) => row.name)).toEqual([
      'France',
      'Belgium'
    ])
    expect(result.view.context.status).toBe('Belgium added.')
    expect(result.after).toEqual(result.before)
  })

  it('Should take the search box away and announce the limit on the twelfth country', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: {
        action: 'add',
        transitedCountry: atCapacity.at(-1),
        transitedCountries: atCapacity.slice(0, -1)
      }
    })
    expect(result.view.context.selectedCountries).toHaveLength(
      MAX_TRANSITED_COUNTRIES
    )
    expect(result.view.context.atLimit).toBe(true)
    expect(result.view.context.showCountryField).toBe(false)
    // The country that reached the cap is said in the same breath as the cap,
    // so the whole sentence is pinned, not just the limit half.
    const lastName = countries.originLabel(atCapacity.at(-1))
    expect(result.view.context.status).toBe(
      `${lastName} added. Maximum of ${MAX_TRANSITED_COUNTRIES} countries reached. Remove a country to add another.`
    )
  })

  // "United Kingdom" resolves through the address-form fallback but is never
  // offered here — the copy above the control says the journey excludes it.
  it('Should refuse GB, which the label lookup resolves but the list never offers', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: { action: 'add', transitedCountry: 'GB', transitedCountries: [] }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors[COUNTRY_FIELD]).toBe(FROM_LIST)
    expect(result.view.context.selectedCountries).toEqual([])
  })
})

describe('POST transit-countries — removing a country', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

  it('Should drop the named country, announce it and commit nothing', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: {
        action: `${REMOVE_ACTION_PREFIX}FR`,
        transitedCountries: ['FR', 'BE']
      }
    })
    expect(result.response.statusCode).toBe(200)
    expect(result.view.context.selectedCountries).toEqual(['BE'])
    expect(result.view.context.status).toBe('France removed.')
    expect(result.after).toEqual(result.before)
  })

  it('Should bring the search box back when a removal drops below the limit', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: {
        action: `${REMOVE_ACTION_PREFIX}${atCapacity[0]}`,
        transitedCountries: atCapacity
      }
    })
    expect(result.view.context.atLimit).toBe(false)
    expect(result.view.context.showCountryField).toBe(true)
  })
})

describe('POST transit-countries — continuing', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

  const cases = [
    {
      name: 'a transited code not in the country list',
      payload: { transitedCountries: ['ZZ'] },
      message: FROM_LIST
    },
    {
      name: `more than ${MAX_TRANSITED_COUNTRIES} transited countries`,
      payload: { transitedCountries: tooManyCodes },
      message: `Select up to ${MAX_TRANSITED_COUNTRIES} countries`
    },
    {
      // GB has a label but is not on the offered list, so a commit of it is
      // refused the same way an unknown code is.
      name: 'a transited GB, which the list never offers',
      payload: { transitedCountries: ['GB'] },
      message: FROM_LIST
    }
  ]

  it.each(cases)(
    'Should re-render with the transitedCountry message for $name and commit nothing',
    async ({ payload, message }) => {
      const result = await driveHandler(post, { seed, payload })
      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.errors[COUNTRY_FIELD]).toBe(message)
      expect(result.after).toEqual(result.before)
    }
  )

  it('Should refuse a GB commit and render nothing back', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: { transitedCountries: ['GB'] }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors[COUNTRY_FIELD]).toBe(FROM_LIST)
    expect(result.view.context.selectedCountries).toEqual([])
  })

  // Only tampering puts a code the list does not contain into the form. The
  // error is raised on the whole submitted list, but nothing unknown is
  // rendered back — so a payload carrying markup never reaches the page.
  it('Should drop a tampered code before rendering and keep the known one', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: {
        transitedCountries: ['FR', '"><img src=x onerror=alert(1)>']
      }
    })
    expect(result.view.context.selectedCountries).toEqual(['FR'])
    expect(result.view.context.countryRows).toEqual([
      { code: 'FR', name: 'France', removeAction: `${REMOVE_ACTION_PREFIX}FR` }
    ])
  })

  it('Should keep the search box on the page when the list is over the limit', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: { transitedCountries: tooManyCodes }
    })
    expect(result.view.context.showCountryField).toBe(true)
  })

  // The question is optional, so an empty list is an answer: it saves and the
  // trader carries on rather than being sent back to the page.
  it('Should commit an empty list and continue when no country was added', async () => {
    const result = await driveHandler(post, { seed, payload: {} })
    expect(result.after.transitedCountries).toEqual([])
    expect(result.response.redirect).toBeDefined()
    expect(result.response.redirect).not.toContain('transit-countries')
  })

  it('Should deduplicate and commit the added country codes', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: { transitedCountries: ['FR', 'BE', 'FR'] }
    })
    expect(result.after.transitedCountries).toEqual(['FR', 'BE'])
    expect(result.response.redirect).not.toContain('transit-countries')
  })
})

describe('GET transit-countries', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

  it('Should offer every country in the search list behind a placeholder', async () => {
    const result = await driveHandler(get, { seed })
    const items = result.view.context.countryItems
    expect(items[0]).toEqual({ value: '', text: 'Search for a country' })
    expect(items.slice(1)).toEqual(countries.originCountries())
  })

  it('Should read the stored countries back as rows, with nothing announced', async () => {
    const result = await driveHandler(get, {
      seed: { ...seed, transitedCountries: ['FR', 'BE'] }
    })
    expect(result.view.context.selectedCountries).toEqual(['FR', 'BE'])
    expect(result.view.context.countryRows.map((row) => row.name)).toEqual([
      'France',
      'Belgium'
    ])
    expect(result.view.context.hasCountries).toBe(true)
    expect(result.view.context.status).toBe('')
  })

  it('Should say the list is empty when nothing has been added', async () => {
    const result = await driveHandler(get, { seed })
    expect(result.view.context.hasCountries).toBe(false)
    expect(result.view.context.countryRows).toEqual([])
  })
})
