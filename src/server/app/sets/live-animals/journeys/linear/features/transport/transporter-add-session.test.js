import { describe, expect, it } from 'vitest'

import {
  PRIVATE,
  COMMERCIAL
} from '../../../../../../services/transporters/index.js'
import {
  addedTransporterBanner,
  clearedEnteredTransporterPatch,
  storedEnteredTransporter,
  transporterTypeRestartPatch,
  TRANSPORTER_ADD_IN_PROGRESS,
  TRANSPORTER_TYPE_RESTART
} from './transporter-add-session.js'

const SAMPLE_BANNER_COPY = {
  title: 'Success',
  text: (name) => `${name} transporter added`
}

describe('#addedTransporterBanner', () => {
  it('Should keep only the first letter of a mixed-case name capitalised', () => {
    expect(addedTransporterBanner('Hill Haulage', SAMPLE_BANNER_COPY)).toEqual({
      titleText: 'Success',
      text: 'Hill haulage transporter added'
    })
  })

  it('Should reduce an all-caps name the same way', () => {
    expect(addedTransporterBanner('ACME HAULAGE', SAMPLE_BANNER_COPY)).toEqual({
      titleText: 'Success',
      text: 'Acme haulage transporter added'
    })
  })
})

describe('#storedEnteredTransporter and #clearedEnteredTransporterPatch', () => {
  const privateValues = { nameOrOrganisationName: 'Jean Dupont' }
  const commercialValues = { nameOrOrganisationName: 'Lough Neagh Ltd' }
  const flowOnlyAnswers = {
    [TRANSPORTER_ADD_IN_PROGRESS]: {
      [PRIVATE]: privateValues,
      [COMMERCIAL]: commercialValues
    }
  }

  it('Should read the entered transporter of the type asked for, leaving the other type alone', () => {
    expect(storedEnteredTransporter(flowOnlyAnswers, PRIVATE)).toEqual(
      privateValues
    )
    expect(storedEnteredTransporter(flowOnlyAnswers, COMMERCIAL)).toEqual(
      commercialValues
    )
  })

  it('Should clear one type’s entered transporter while leaving the other type’s in the patch', () => {
    const patch = clearedEnteredTransporterPatch(flowOnlyAnswers, PRIVATE)

    expect(
      storedEnteredTransporter(
        { [TRANSPORTER_ADD_IN_PROGRESS]: patch[TRANSPORTER_ADD_IN_PROGRESS] },
        PRIVATE
      )
    ).toBeUndefined()
    expect(
      storedEnteredTransporter(
        { [TRANSPORTER_ADD_IN_PROGRESS]: patch[TRANSPORTER_ADD_IN_PROGRESS] },
        COMMERCIAL
      )
    ).toEqual(commercialValues)
  })
})

describe('#transporterTypeRestartPatch', () => {
  it('Should flag the restart', () => {
    expect(transporterTypeRestartPatch()).toEqual({
      [TRANSPORTER_TYPE_RESTART]: true
    })
  })
})
