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

export const typedInCommercialTransporterPayload = Object.freeze({
  approvalNumber: 'UK/BELF/T2/00104115',
  nameOrOrganisationName: 'Lough Neagh Livestock Ltd',
  addressLine1: '4 Quay Road',
  addressLine2: '',
  townOrCity: 'Belfast',
  county: 'County Antrim',
  postcode: 'BT1 3LG',
  country: 'Northern Ireland',
  email: 'movements@lough-neagh.example.com',
  phone: '+44 28 9000 0111'
})

export const typedInPrivateTransporterPayload = Object.freeze({
  nameOrOrganisationName: 'Jean Dupont',
  addressLine1: '12 Rue des Fermes',
  addressLine2: '',
  townOrCity: 'Amiens',
  county: '',
  postcode: '80000',
  country: 'France',
  phone: '+33 3 22 55 01 44',
  email: 'jean.dupont@example.fr'
})
