import { describe, expect, test } from 'vitest'

import { validateStoredAnswers } from './validate-stored.js'

const ctxWith = (registerEntries) => ({
  transporterRegister: new Map(registerEntries)
})

const KNOWN_NAME = 'Known Transport Ltd'
const KNOWN_KEY = 'known transport ltd'
const KNOWN_RECORD = { id: 'r-1', name: KNOWN_NAME }

describe('#validateStoredAnswers for transporters', () => {
  test('Should return no errors when the trader has not saved a transporter', async () => {
    expect(await validateStoredAnswers({}, ctxWith([]))).toEqual({})
  })

  test('Should accept a commercial transporter whose name still resolves', async () => {
    expect(
      await validateStoredAnswers(
        { commercialTransporter: { name: KNOWN_NAME } },
        ctxWith([[KNOWN_KEY, KNOWN_RECORD]])
      )
    ).toEqual({})
  })

  test('Should accept a private transporter whose name still resolves', async () => {
    expect(
      await validateStoredAnswers(
        { privateTransporter: { name: KNOWN_NAME } },
        ctxWith([[KNOWN_KEY, KNOWN_RECORD]])
      )
    ).toEqual({})
  })

  test('Should resolve a stored name whose case/spacing differs from the register', async () => {
    expect(
      await validateStoredAnswers(
        { commercialTransporter: { name: '  known   transport ltd  ' } },
        ctxWith([[KNOWN_KEY, KNOWN_RECORD]])
      )
    ).toEqual({})
  })

  test('Should surface a stored transporter the register no longer holds', async () => {
    const errors = await validateStoredAnswers(
      { commercialTransporter: { name: 'Gone Ltd' } },
      ctxWith([[KNOWN_KEY, KNOWN_RECORD]])
    )
    expect(errors).toHaveProperty('transporter')
  })
})
