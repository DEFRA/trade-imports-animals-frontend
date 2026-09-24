import { describe, expect, it } from 'vitest'

import { validation } from './validate.js'

const CAMPBELL_ID = 'j-and-g-campbell'
const CAMPBELL_NAME = 'J & G Campbell LTD'

const record = (id, name) => ({ id, name })

const requestWith = (organisationId) => ({
  auth: { credentials: { organisationId } }
})

const requestWithoutOrg = requestWith(undefined)

describe('#validation for transporters — onSubmit', () => {
  it('Should accept a picked id that is in the rendered records', async () => {
    const { errors } = await validation.onSubmit(
      { transporter: CAMPBELL_ID },
      { records: [record(CAMPBELL_ID, CAMPBELL_NAME)] }
    )
    expect(errors).toEqual({})
  })

  it('Should reject a picked id that is not on the rendered list', async () => {
    const { errors } = await validation.onSubmit(
      { transporter: 'not-a-row' },
      { records: [record(CAMPBELL_ID, CAMPBELL_NAME)] }
    )
    expect(errors).toHaveProperty('transporter')
  })

  // The page walks on without saving when a trader has not picked yet, matching
  // the step it replaced — so an empty pick is silent, not an error.
  it('Should accept a submission with no pick', async () => {
    const { errors } = await validation.onSubmit(
      {},
      { records: [record(CAMPBELL_ID, CAMPBELL_NAME)] }
    )
    expect(errors).toEqual({})
  })
})

describe('#validation for transporters — onStored', () => {
  it('Should return no errors when nothing is stored', async () => {
    const { errors } = await validation.onStored(
      {},
      {
        request: requestWithoutOrg,
        storedAnswers: {}
      }
    )
    expect(errors).toEqual({})
  })

  it('Should accept a stored transporter whose name still matches the register', async () => {
    const stored = {
      commercialTransporter: { name: CAMPBELL_NAME }
    }
    const { errors } = await validation.onStored(stored, {
      request: requestWithoutOrg,
      storedAnswers: stored
    })
    expect(errors).toEqual({})
  })

  it('Should reject a stored transporter that no longer appears in the register', async () => {
    const stored = {
      commercialTransporter: { name: 'Ghost Transport Ltd' }
    }
    const { errors } = await validation.onStored(stored, {
      request: requestWithoutOrg,
      storedAnswers: stored
    })
    expect(errors).toHaveProperty('transporter')
  })
})
