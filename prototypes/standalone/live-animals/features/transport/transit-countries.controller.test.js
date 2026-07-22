import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { readyForCheckYourAnswers } from '../../flow/section-status.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from '../../engine/read.js'
import { driveHandler, postHandlerOf } from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'
import * as countries from '../../services/countries/index.js'

import * as transitCountries from './transit-countries.controller.js'
import { MAX_TRANSITED_COUNTRIES } from './transit-countries.controller.js'

const post = postHandlerOf(transitCountries)
const tooManyCodes = countries
  .originCountries()
  .slice(0, MAX_TRANSITED_COUNTRIES + 1)
  .map((country) => country.value)

describe('POST transit-countries', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  const cases = [
    {
      name: 'a transited code not in the country list',
      payload: { transitedCountries: ['ZZ'] },
      message: 'Select countries from the list'
    },
    {
      name: `more than ${MAX_TRANSITED_COUNTRIES} transited countries`,
      payload: { transitedCountries: tooManyCodes },
      message: `Select up to ${MAX_TRANSITED_COUNTRIES} countries`
    }
  ]

  it.each(cases)(
    'Should re-render with the transitedCountries message for $name and commit nothing',
    async ({ payload, message }) => {
      const result = await driveHandler(post, {
        seed: { meansOfTransport: 'ROAD_VEHICLE' },
        payload
      })
      expect(result.view.context.errors.transitedCountries).toBe(message)
      expect(result.after).toEqual(result.before)
    }
  )

  it('Should commit the selection and return to the page when adding another country', async () => {
    const result = await driveHandler(post, {
      seed: { meansOfTransport: 'ROAD_VEHICLE' },
      payload: { transitedCountries: 'FR', addCountry: 'add' }
    })
    expect(result.after.transitedCountries).toEqual(['FR'])
    expect(result.response.redirect).toContain('transit-countries')
  })
})
