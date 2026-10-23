import { SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'

import {
  driveHandler,
  expectBackLinkIsPage,
  expectOneLogged,
  expectOneRefusalLogged,
  expectOneSaveFallbackLogged,
  postHandlerOf,
  unavailableBackendError,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../../lib/http-status.js'
import { hubPath } from '../../../../../../../shared/paths.js'
import { RUN_ACTIVE } from '../../../../../../../flow/run-state.js'
import { dispatchPages } from '../../index.js'
import * as countries from '../../../../../../../services/countries/index.js'

import * as transitCountries from './transit-countries.controller.js'
import {
  COUNTRY_FIELD,
  MAX_TRANSITED_COUNTRIES
} from './transit-countries.controller.js'
import { REMOVE_ACTION_PREFIX } from './remove-action.js'
import { TRANSIT_REFUSAL } from './validate.js'

const get = transitCountries.routes.find(
  (route) => route.method === 'GET'
).handler
const post = postHandlerOf(transitCountries)

const codes = (await countries.originCountries()).map(
  (country) => country.value
)
const atCapacity = codes.slice(0, MAX_TRANSITED_COUNTRIES)
const tooManyCodes = codes.slice(0, MAX_TRANSITED_COUNTRIES + 1)
const seed = { meansOfTransport: 'ROAD_VEHICLE' }
const NOT_ON_THE_LIST_MESSAGE = 'Select countries from the list'
const SELECT_TEXT = 'Select a country'

describe('POST transit-countries — adding a country', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  const refusals = [
    {
      name: 'nothing chosen in the search box',
      payload: { action: 'add', transitedCountries: ['FR'] },
      message: 'Enter a country to add',
      reason: TRANSIT_REFUSAL.nothingChosen,
      code: ''
    },
    {
      name: 'a country that is not in the list',
      payload: { action: 'add', transitedCountry: 'ZZ' },
      message: NOT_ON_THE_LIST_MESSAGE,
      reason: TRANSIT_REFUSAL.notOnList,
      code: 'ZZ'
    },
    {
      name: 'a country that has already been added',
      payload: {
        action: 'add',
        transitedCountry: 'FR',
        transitedCountries: ['FR']
      },
      message: 'You have already added France',
      reason: TRANSIT_REFUSAL.alreadyAdded,
      code: 'FR'
    },
    {
      name: 'a thirteenth country',
      payload: {
        action: 'add',
        transitedCountry: codes[MAX_TRANSITED_COUNTRIES],
        transitedCountries: atCapacity
      },
      message: `Select up to ${MAX_TRANSITED_COUNTRIES} countries`,
      reason: TRANSIT_REFUSAL.maxCountries,
      code: codes[MAX_TRANSITED_COUNTRIES]
    }
  ]

  it.each(refusals)(
    'Should refuse $name, keep the search box on the page and commit nothing',
    async ({ payload, message }) => {
      const result = await driveHandler(post, { seed, payload })
      expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result.view.context.errors[COUNTRY_FIELD]).toBe(message)
      expect(result.view.context.showCountryField).toBe(true)
      expect(result.after).toEqual(result.before)
    }
  )

  it.each(refusals)(
    'Should log the refusal of $name once at info with the journey id, the reason and the chosen code',
    async ({ payload, reason, code }) => {
      const result = await driveHandler(post, { seed, payload })

      expectOneRefusalLogged(result.logger, {
        journeyId: result.journeyId,
        errorCodes: [COUNTRY_FIELD],
        reason,
        code
      })
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

  it('Should log nothing when a country is added', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: {
        action: 'add',
        transitedCountry: 'BE',
        transitedCountries: ['FR']
      }
    })

    expect(result.logger.entries).toEqual([])
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
    const lastName = await countries.originLabel(atCapacity.at(-1))
    expect(result.view.context.status).toBe(
      `${lastName} added. Maximum of ${MAX_TRANSITED_COUNTRIES} countries reached. Remove a country to add another.`
    )
  })

  it('Should refuse GB, which the label lookup resolves but the list never offers', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: { action: 'add', transitedCountry: 'GB', transitedCountries: [] }
    })
    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.view.context.errors[COUNTRY_FIELD]).toBe(
      NOT_ON_THE_LIST_MESSAGE
    )
    expect(result.view.context.selectedCountries).toEqual([])
  })
})

describe('POST transit-countries — removing a country', () => {
  useStubbedJourney(SET_ID, dispatchPages)

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
  useStubbedJourney(SET_ID, dispatchPages)

  const cases = [
    {
      name: 'a transited code not in the country list',
      payload: { transitedCountries: ['ZZ'] },
      message: NOT_ON_THE_LIST_MESSAGE,
      rendered: []
    },
    {
      name: `more than ${MAX_TRANSITED_COUNTRIES} transited countries`,
      payload: { transitedCountries: tooManyCodes },
      message: `Select up to ${MAX_TRANSITED_COUNTRIES} countries`,
      rendered: tooManyCodes
    },
    {
      name: 'a transited GB, which the list never offers',
      payload: { transitedCountries: ['GB'] },
      message: NOT_ON_THE_LIST_MESSAGE,
      rendered: []
    }
  ]

  it.each(cases)(
    'Should re-render with the transitedCountry message for $name, render back only the offered codes and commit nothing',
    async ({ payload, message, rendered }) => {
      const result = await driveHandler(post, { seed, payload })
      expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result.view.context.errors[COUNTRY_FIELD]).toBe(message)
      expect(result.view.context.selectedCountries).toEqual(rendered)
      expect(result.after).toEqual(result.before)
    }
  )

  it('Should log a submitted code the page does not offer once at info with the journey id, the reason and the code', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: { transitedCountries: ['ZZ'] }
    })

    expectOneRefusalLogged(result.logger, {
      journeyId: result.journeyId,
      errorCodes: [COUNTRY_FIELD],
      reason: TRANSIT_REFUSAL.notOnList,
      codes: ['ZZ']
    })
  })

  it('Should log a submitted list over the limit once at info with the journey id, the reason and the list length', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: { transitedCountries: tooManyCodes }
    })

    expectOneRefusalLogged(result.logger, {
      journeyId: result.journeyId,
      errorCodes: [COUNTRY_FIELD],
      reason: TRANSIT_REFUSAL.maxCountries,
      length: MAX_TRANSITED_COUNTRIES + 1
    })
  })

  it('Should render only the offered codes back, so a tampered code carrying markup never reaches the page', async () => {
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

  it('Should commit an empty list and continue when no country was added, the question being optional', async () => {
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

  it('Should re-render at 500 with the recoverable-error flag when the backend is unavailable on save', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: { transitedCountries: ['FR'] },
      saveFailure: unavailableBackendError('save answers')
    })

    expect(result.response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    expect(result.view.context.recoverableError).toBe(true)
  })

  it('Should log the unavailable backend once at warn with the journey id and the error', async () => {
    const failure = unavailableBackendError('save answers')

    const result = await driveHandler(post, {
      seed,
      payload: { transitedCountries: ['FR'] },
      saveFailure: failure
    })

    expectOneSaveFallbackLogged(result.logger, {
      journeyId: result.journeyId,
      err: failure
    })
  })
})

describe('POST transit-countries — Save and return to overview', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should go to the overview without an error when saved and returned with no country chosen', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: { exit: 'hub' }
    })
    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.after.transitedCountries).toEqual([])
  })
})

describe('GET transit-countries — a stored list containing a code the page no longer offers', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should filter the stale code out of the rendered rows', async () => {
    const result = await driveHandler(get, {
      seed: { ...seed, transitedCountries: ['FR', 'BE', 'ZZ'] }
    })
    expect(result.view.context.selectedCountries).toEqual(['FR', 'BE'])
    expect(
      result.view.context.countryRows.map((row) => row.code)
    ).not.toContain('ZZ')
  })

  it('Should surface a banner-style error naming that some saved countries are no longer available', async () => {
    const result = await driveHandler(get, {
      seed: { ...seed, transitedCountries: ['FR', 'BE', 'ZZ'] }
    })
    expect(result.view.context.errors[COUNTRY_FIELD]).toBe(
      'Some of your saved transit countries are no longer available. Review the list before you continue.'
    )
    expect(result.view.context.errorSummary).not.toBeNull()
  })

  it('Should log the stale code once at info with the journey id and the no-longer-available reason', async () => {
    const result = await driveHandler(get, {
      seed: { ...seed, transitedCountries: ['FR', 'BE', 'ZZ'] }
    })

    expectOneLogged(result.logger, {
      level: 'info',
      fields: {
        journeyId: result.journeyId,
        reason: TRANSIT_REFUSAL.noLongerAvailable,
        codes: ['ZZ']
      },
      message: 'Stored transit countries refused: banner shown'
    })
  })

  it('Should not surface the banner when every stored code is still offered', async () => {
    const result = await driveHandler(get, {
      seed: { ...seed, transitedCountries: ['FR', 'BE'] }
    })
    expect(result.view.context.errors).toEqual({})
  })

  it('Should log nothing when every stored code is still offered', async () => {
    const result = await driveHandler(get, {
      seed: { ...seed, transitedCountries: ['FR', 'BE'] }
    })

    expect(result.logger.entries).toEqual([])
  })

  it('Should leave the stored list intact on GET', async () => {
    const result = await driveHandler(get, {
      seed: { ...seed, transitedCountries: ['FR', 'BE', 'ZZ'] }
    })
    expect(result.after.transitedCountries).toEqual(['FR', 'BE', 'ZZ'])
  })
})

describe('POST transit-countries — Continue silently drops stored stale codes via the filtered working list', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should commit only the codes the render filtered through', async () => {
    const result = await driveHandler(post, {
      seed: { ...seed, transitedCountries: ['FR', 'BE', 'ZZ'] },
      payload: { transitedCountries: ['FR', 'BE'] }
    })
    expect(result.before.transitedCountries).toEqual(['FR', 'BE', 'ZZ'])
    expect(result.after.transitedCountries).toEqual(['FR', 'BE'])
    expect(result.response.redirect).toBeDefined()
  })
})

describe('GET transit-countries', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should open the country list with an empty-valued entry reading "Select a country", then every origin country', async () => {
    const result = await driveHandler(get, { seed })
    const items = result.view.context.countryItems
    expect(items[0]).toEqual({ value: '', text: SELECT_TEXT })
    expect(items.slice(1)).toEqual(await countries.originCountries())
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

  it('Should give no rows and no table when nothing has been added', async () => {
    const result = await driveHandler(get, { seed })
    expect(result.view.context.hasCountries).toBe(false)
    expect(result.view.context.countryRows).toEqual([])
  })
})

describe('transit-countries — the Back link', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  const catSeed = {
    ...seed,
    countryOfOrigin: 'FR',
    commodityLines: [{ commoditySelection: 'Cat', speciesSelection: '923501' }]
  }

  it('Should go Back to the arrival details while the opening run is on', async () => {
    const result = await driveHandler(get, {
      seed: catSeed,
      openingRun: RUN_ACTIVE
    })
    expectBackLinkIsPage(result, 'port-of-entry')
  })

  it('Should keep Back on the arrival details when the page is shown again after adding a country in the run', async () => {
    const result = await driveHandler(post, {
      seed: catSeed,
      payload: { action: 'add', transitedCountry: 'FR' },
      openingRun: RUN_ACTIVE
    })
    expectBackLinkIsPage(result, 'port-of-entry')
  })

  it('Should go Back to the overview when the page is opened from the overview', async () => {
    const result = await driveHandler(get, { seed: catSeed })
    expect(result.view.context.backLink).toBe(hubPath(result.journeyId))
  })
})
