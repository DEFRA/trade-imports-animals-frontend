import { SET_ID } from '../../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import {
  configureSession,
  openingRunCookie
} from '../../../../../../../engine/persistence/session.js'
import {
  RUN_ACTIVE,
  RUN_COMPLETE
} from '../../../../../../../flow/run-state.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  journeyRequest,
  postHandlerOf,
  stubH
} from '../../../../../../../engine/test-support.js'
import { hubPath, pagePath } from '../../../../../../../shared/paths.js'
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

const codes = (await countries.originCountries()).map(
  (country) => country.value
)
const atCapacity = codes.slice(0, MAX_TRANSITED_COUNTRIES)
const tooManyCodes = codes.slice(0, MAX_TRANSITED_COUNTRIES + 1)
const seed = { meansOfTransport: 'ROAD_VEHICLE' }
// The one message for a code the offered list does not contain, whichever
// guard raises it.
const FROM_LIST = 'Select countries from the list'
const TRANSIT_SLUG = 'transit-countries'
// A subdivision is offered, added and listed under its parent-named label.
const SUBDIVISION = 'ES-CN'
const SUBDIVISION_NAME = 'Canary Islands (Spain)'

const configure = () => {
  configureRecords(SET_ID, recordsStub)
  configureSession(SET_ID, sessionStub)
  buildDispatch(SET_ID, dispatchPages)
}

const driveWithRun = async (
  handler,
  phase,
  { seed: answers = seed, payload = {} } = {}
) => {
  const journey = await store.create()
  await store.seedAnswers(journey.journeyId, answers)
  const h = stubH()
  const response = await handler(
    journeyRequest(journey.journeyId, {
      payload,
      state: { [openingRunCookie()]: { [journey.journeyId]: phase } }
    }),
    h
  )
  return { journeyId: journey.journeyId, response, view: h.captured.view }
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
      name: 'a subdivision that has already been added',
      payload: {
        action: 'add',
        transitedCountry: SUBDIVISION,
        transitedCountries: [SUBDIVISION]
      },
      message: `You have already added ${SUBDIVISION_NAME}`
    },
    {
      name: 'a subdivision that is not in the list',
      payload: { action: 'add', transitedCountry: 'ES-XX' },
      message: FROM_LIST
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

  it('Should put a refused subdivision back into the search box under its parent-named label', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: {
        action: 'add',
        transitedCountry: SUBDIVISION,
        transitedCountries: [SUBDIVISION]
      }
    })
    expect(result.view.context.chosenValue).toBe(SUBDIVISION)
    expect(result.view.context.chosenLabel).toBe(SUBDIVISION_NAME)
  })

  it('Should add a subdivision under its parent-named label and announce it', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: {
        action: 'add',
        transitedCountry: SUBDIVISION,
        transitedCountries: []
      }
    })
    expect(result.response.statusCode).toBe(200)
    expect(result.view.context.selectedCountries).toEqual([SUBDIVISION])
    expect(result.view.context.countryRows.map((row) => row.name)).toEqual([
      SUBDIVISION_NAME
    ])
    expect(result.view.context.status).toBe(`${SUBDIVISION_NAME} added.`)
    expect(result.after).toEqual(result.before)
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
    const lastName = await countries.originLabel(atCapacity.at(-1))
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
      name: 'a transited subdivision code not in the list',
      payload: { transitedCountries: ['ES-XX'] },
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
    expect(result.response.redirect).not.toContain(TRANSIT_SLUG)
  })

  it('Should commit a subdivision code and continue', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: { transitedCountries: ['FR', SUBDIVISION] }
    })
    expect(result.after.transitedCountries).toEqual(['FR', SUBDIVISION])
    expect(result.response.redirect).not.toContain(TRANSIT_SLUG)
  })

  it('Should deduplicate and commit the added country codes', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: { transitedCountries: ['FR', 'BE', 'FR'] }
    })
    expect(result.after.transitedCountries).toEqual(['FR', 'BE'])
    expect(result.response.redirect).not.toContain(TRANSIT_SLUG)
  })
})

describe('POST transit-countries — Save and return to overview', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

  it('Should go to the overview without an error when saved and returned with no country chosen', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: { exit: 'hub' }
    })
    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.after.transitedCountries).toEqual([])
  })

  it('Should save the listed countries and go to the overview on Save and return to overview', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: { transitedCountries: ['FR', 'BE'], exit: 'hub' }
    })
    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.after.transitedCountries).toEqual(['FR', 'BE'])
  })
})

// `ZZ` is absent from the captured countries fixture, so seeding it inside
// the stored list puts one entry outside the current offered set — a
// "stale" code the reader no longer offers.

describe('GET transit-countries — a stored list containing a stale code', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

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

  it('Should not surface the banner when every stored code is still offered', async () => {
    const result = await driveHandler(get, {
      seed: { ...seed, transitedCountries: ['FR', 'BE'] }
    })
    expect(result.view.context.errors).toEqual({})
  })

  it('Should leave the stored list intact on GET', async () => {
    const result = await driveHandler(get, {
      seed: { ...seed, transitedCountries: ['FR', 'BE', 'ZZ'] }
    })
    expect(result.after.transitedCountries).toEqual(['FR', 'BE', 'ZZ'])
  })
})

describe('POST transit-countries — Continue silently drops stored stale codes via the filtered working list', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

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
  beforeAll(configure)
  beforeEach(() => store.clear())

  it('Should offer every country and subdivision in the search list behind a placeholder, in alphabetical order', async () => {
    const result = await driveHandler(get, { seed })
    const items = result.view.context.countryItems
    expect(items[0]).toEqual({ value: '', text: 'Search for a country' })
    expect(items.slice(1)).toEqual(await countries.destinationCountryOptions())
  })

  it('Should name each subdivision in the search list with its parent country', async () => {
    const result = await driveHandler(get, { seed })
    const items = result.view.context.countryItems.slice(1)
    expect(items).toContainEqual({
      value: SUBDIVISION,
      text: SUBDIVISION_NAME
    })
    const names = items.map((item) => item.text)
    expect(names).toEqual(
      [...names].sort((left, right) => left.localeCompare(right))
    )
  })

  it('Should read a stored subdivision back under its parent-named label, with no error', async () => {
    const result = await driveHandler(get, {
      seed: { ...seed, transitedCountries: [SUBDIVISION] }
    })
    expect(result.view.context.countryRows.map((row) => row.name)).toEqual([
      SUBDIVISION_NAME
    ])
    expect(result.view.context.errors).toEqual({})
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

  it('Should list no countries when nothing has been added', async () => {
    const result = await driveHandler(get, { seed })
    expect(result.view.context.hasCountries).toBe(false)
    expect(result.view.context.countryRows).toEqual([])
  })
})

describe('GET transit-countries — title and Back link', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

  it("Should title the browser tab 'Transit countries' and keep the question as the heading", async () => {
    const result = await driveHandler(get, { seed })
    expect(result.view.context.pageTitle).toBe('Transit countries')
    expect(result.view.context.copy.title).toBe(
      'Which countries will the consignment travel through?'
    )
  })

  it("Should keep the 'Transit countries' title when a refused Add shows an error", async () => {
    const result = await driveHandler(post, {
      seed,
      payload: { action: 'add', transitedCountries: [] }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.pageTitle).toBe('Transit countries')
    expect(result.view.context.errorSummary).not.toBeNull()
  })

  it('Should point Back at the arrival details while the opening run is under way', async () => {
    const { journeyId, view } = await driveWithRun(get, RUN_ACTIVE)
    expect(view.context.backLink).toBe(pagePath(journeyId, 'port-of-entry'))
  })

  it('Should point Back at the overview once the opening run is over', async () => {
    const complete = await driveWithRun(get, RUN_COMPLETE)
    expect(complete.view.context.backLink).toBe(hubPath(complete.journeyId))
    const result = await driveHandler(get, { seed })
    expect(result.view.context.backLink).toBe(hubPath(result.journeyId))
  })

  it('Should keep Back on the arrival details when an Add is refused mid-run', async () => {
    const { journeyId, response, view } = await driveWithRun(post, RUN_ACTIVE, {
      payload: { action: 'add' }
    })
    expect(response.statusCode).toBe(400)
    expect(view.context.backLink).toBe(pagePath(journeyId, 'port-of-entry'))
  })
})

describe('transit-countries — only for rail or road', () => {
  beforeAll(configure)
  beforeEach(() => store.clear())

  const notOverland = [
    { name: 'Air', seed: { meansOfTransport: 'AIRPLANE' } },
    { name: 'Sea', seed: { meansOfTransport: 'VESSEL' } },
    { name: 'not saved', seed: {} }
  ]

  it.each(notOverland)(
    'Should send a GET to the overview when the means of transport is $name',
    async ({ seed: answers }) => {
      const result = await driveHandler(get, { seed: answers })
      expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
      expect(result.view).toBeUndefined()
    }
  )

  it.each(notOverland)(
    'Should save no countries and go to the overview on Save and continue when the means of transport is $name',
    async ({ seed: answers }) => {
      const result = await driveHandler(post, {
        seed: answers,
        payload: { transitedCountries: ['FR', 'BE'] }
      })
      expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
      expect(result.after.transitedCountries).toBeUndefined()
      expect(result.view).toBeUndefined()
    }
  )

  it.each([
    ['an Add', { action: 'add', transitedCountry: 'FR' }],
    [
      'a Remove',
      { action: `${REMOVE_ACTION_PREFIX}FR`, transitedCountries: ['FR'] }
    ],
    ['Save and return to overview', { transitedCountries: ['FR'], exit: 'hub' }]
  ])(
    'Should send %s to the overview without rendering or saving when the means of transport is Air',
    async (_name, payload) => {
      const result = await driveHandler(post, {
        seed: { meansOfTransport: 'AIRPLANE' },
        payload
      })
      expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
      expect(result.view).toBeUndefined()
      expect(result.after.transitedCountries).toBeUndefined()
    }
  )
})
