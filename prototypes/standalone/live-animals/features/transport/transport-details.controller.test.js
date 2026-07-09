import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { readyForCheckYourAnswers } from '../../flow/section-status.js'
import { store } from '../../engine/store.js'
import { configureReadyForCheckYourAnswers } from '../../engine/read.js'
import { driveHandler, postHandlerOf } from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'
import * as transportReference from '../../services/transport-reference/index.js'
import * as countries from '../../services/countries/index.js'

import * as transportDetails from './transport-details.controller.js'
import { MAX_TRANSITED_COUNTRIES } from './transport-details.controller.js'

const post = postHandlerOf(transportDetails)
const validMeans = transportReference.meansOfTransport()[2]
const tooManyCodes = countries
  .originCountries()
  .slice(0, MAX_TRANSITED_COUNTRIES + 1)
  .map((country) => country.value)

describe('POST transport-details — invalid payload', () => {
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  const cases = [
    {
      name: 'a transited code not in the country list',
      payload: { meansOfTransport: validMeans, transitedCountries: ['ZZ'] },
      message: 'Select countries from the list'
    },
    {
      name: `more than ${MAX_TRANSITED_COUNTRIES} transited countries`,
      payload: {
        meansOfTransport: validMeans,
        transitedCountries: tooManyCodes
      },
      message: `Select up to ${MAX_TRANSITED_COUNTRIES} countries`
    }
  ]

  it.each(cases)(
    'Should re-render with the transitedCountries message for $name and commit nothing',
    ({ payload, message }) => {
      const result = driveHandler(post, { payload })
      expect(result.view.context.errors.transitedCountries).toBe(message)
      expect(result.after).toEqual(result.before)
    }
  )
})
