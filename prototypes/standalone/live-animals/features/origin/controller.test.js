import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { readyForCheckYourAnswers } from '../../flow/section-status.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { configureReadyForCheckYourAnswers } from '../../engine/read.js'
import { driveHandler, postHandlerOf } from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'

import * as origin from './controller.js'

const post = postHandlerOf(origin)

describe('POST origin — invalid payload', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  const cases = [
    {
      name: 'blank countryOfOrigin',
      payload: {
        countryOfOrigin: '',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: 'Imports456GB'
      },
      field: 'countryOfOrigin',
      message: 'Select the country where the animal originates from'
    },
    {
      name: 'non-alphanumeric internalReferenceNumber',
      payload: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: 'bad ref!'
      },
      field: 'internalReferenceNumber',
      message: 'Internal reference must only contain letters and numbers'
    }
  ]

  it.each(cases)(
    'Should re-render $name with its message and commit nothing',
    ({ payload, field, message }) => {
      const result = driveHandler(post, { payload })
      expect(result.view.context.errors[field]).toBe(message)
      expect(result.after).toEqual(result.before)
    }
  )
})
