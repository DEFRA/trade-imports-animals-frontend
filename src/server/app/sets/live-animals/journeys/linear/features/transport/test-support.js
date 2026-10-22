import { afterEach, beforeEach, expect } from 'vitest'

import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../../../../lib/http-status.js'
import {
  forgetAddedTransporters,
  parties,
  partiesFor
} from '../../../../../../services/transporters/index.js'

export const addedTransportersOf = (organisationId) =>
  partiesFor(organisationId).filter(
    (record) => !parties().some((shipped) => shipped.id === record.id)
  )

export const forgetAddedTransportersAroundEachTest = () => {
  beforeEach(forgetAddedTransporters)
  afterEach(forgetAddedTransporters)
}

export const expectRecoverableSaveFailureKeepingValues = (
  response,
  values,
  { keptIn = (context) => context.values } = {}
) => {
  expect(response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  expect(response.context.recoverableError).toBe(true)
  expect(keptIn(response.context)).toEqual(values)
}
