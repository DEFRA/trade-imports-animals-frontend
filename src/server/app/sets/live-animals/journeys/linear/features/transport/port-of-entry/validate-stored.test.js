import { describe, expect, test } from 'vitest'

import { validateStoredAnswers } from './validate-stored.js'
import { answersFrom } from './port-of-entry.controller.js'

const VALID_PORT = 'GB ABD'
const VALID_MEANS = 'ROAD_VEHICLE'

// A date the arrival window always accepts: today (Europe/London), which is
// inside the window by construction (min = today - 7 days, max = today + 6 months).
const todayDdMmYyyy = () => {
  const now = new Date().toLocaleDateString('en-GB', {
    timeZone: 'Europe/London'
  })
  return now
}

const storedAnswers = (overrides = {}) => {
  const [day, month, year] = todayDdMmYyyy().split('/')
  return {
    arrivalDateAtPort: { day, month, year },
    portOfEntry: VALID_PORT,
    meansOfTransport: VALID_MEANS,
    transportIdentification: 'BLUE VAN',
    transportDocumentReference: 'DOC-123',
    ...overrides
  }
}

describe('#validateStoredAnswers for port-of-entry', () => {
  test('Should return no errors when every stored value still validates', async () => {
    expect(await validateStoredAnswers(storedAnswers())).toEqual({})
  })

  test('Should return no errors when every stored value is blank', async () => {
    expect(
      await validateStoredAnswers({
        arrivalDateAtPort: { day: '', month: '', year: '' },
        portOfEntry: '',
        meansOfTransport: '',
        transportIdentification: '',
        transportDocumentReference: ''
      })
    ).toEqual({})
  })

  test('Should surface a stale port that the current catalogue no longer offers', async () => {
    const errors = await validateStoredAnswers(
      storedAnswers({ portOfEntry: 'XX GONE' })
    )
    expect(errors).toHaveProperty('portOfEntry')
  })

  test('Should surface a stored arrival date that has drifted out of the window', async () => {
    const past = new Date()
    past.setMonth(past.getMonth() - 2)
    const errors = await validateStoredAnswers(
      storedAnswers({
        arrivalDateAtPort: {
          day: String(past.getUTCDate()),
          month: String(past.getUTCMonth() + 1),
          year: String(past.getUTCFullYear())
        }
      })
    )
    expect(errors).toHaveProperty('arrivalDateAtPort')
  })

  test('Should surface a stored arrival date that is not a real calendar date', async () => {
    const errors = await validateStoredAnswers(
      storedAnswers({
        arrivalDateAtPort: { day: '31', month: '2', year: '2027' }
      })
    )
    expect(errors).toHaveProperty('arrivalDateAtPort')
  })

  test('Should surface a stored means-of-transport that the catalogue no longer offers', async () => {
    const errors = await validateStoredAnswers(
      storedAnswers({ meansOfTransport: 'JETPACK' })
    )
    expect(errors).toHaveProperty('meansOfTransport')
  })

  test('Should surface a stored transport identification that exceeds the length cap', async () => {
    const errors = await validateStoredAnswers(
      storedAnswers({ transportIdentification: 'x'.repeat(60) })
    )
    expect(errors).toHaveProperty('transportIdentification')
  })

  test('Should surface a stored transport document reference that exceeds the length cap', async () => {
    const errors = await validateStoredAnswers(
      storedAnswers({ transportDocumentReference: 'y'.repeat(60) })
    )
    expect(errors).toHaveProperty('transportDocumentReference')
  })

  // Round-trip: any valid payload projected through the real POST-time
  // storage transform (answersFrom) and back through the hook's inverse
  // must re-validate cleanly. Guards against projection bugs that would
  // make the hook flag a payload the POST handler would have accepted.
  test('Should round-trip a valid payload through answersFrom -> validateStoredAnswers with no errors', async () => {
    const payload = {
      arrivalDateAtPort: todayDdMmYyyy(),
      portOfEntry: VALID_PORT,
      meansOfTransport: VALID_MEANS,
      transportIdentification: 'BLUE VAN',
      transportDocumentReference: 'DOC-123'
    }
    const stored = answersFrom(payload)

    expect(await validateStoredAnswers(stored)).toEqual({})
  })
})
