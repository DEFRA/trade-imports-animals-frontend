import { beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { IN_PROGRESS } from '../../../engine/persistence/records.js'
import { assembleFulfilments } from '../../../bridge/assemble-fulfilments.js'
import { projectAnswers } from '../../../bridge/fulfilments.js'
import { toNotification } from './mapper.js'
import { records } from './real.js'

// S3 hardening — backend null echo. The backend echoes typed-but-unset nested
// objects as null (e.g. transport.transporter: null before the transporter
// step), and the mapper treats null as present (null !== undefined), crashing
// in transporterToAnswers. The adapter must normalise backend nulls at its
// boundary — stripNulls on the notification BEFORE mapping — so the mapper
// stays pure. This pins that at the HTTP boundary, not via a module spy.

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const nullPaddedEcho = {
  referenceNumber: 'GBN-1',
  status: 'DRAFT',
  transport: {
    portOfEntry: 'GB ABD',
    arrivalDate: '2026-12-12',
    transporter: null
  },
  origin: null,
  commodity: null,
  cphNumber: null
}

describe('real records adapter — backend null-padded echo', () => {
  beforeEach(() => {
    fetchMocker.resetMocks()
    fetchMocker.mockResponse(JSON.stringify(nullPaddedEcho))
  })

  it('Should strip echoed nulls before mapping so canonical replacement does not throw', async () => {
    const answers = {
      portOfEntry: 'GB ABD',
      arrivalDateAtPort: { day: 12, month: 12, year: 2026 }
    }
    const record = await records.replaceFulfilment(
      'GBN-1',
      assembleFulfilments(answers),
      { known: { journeyId: 'GBN-1', status: IN_PROGRESS } }
    )

    expect(projectAnswers(record.fulfilment)).toEqual({
      portOfEntry: 'GB ABD',
      arrivalDateAtPort: { day: 12, month: 12, year: 2026 }
    })
    expect(await fetchMocker.requests()[0].clone().json()).toEqual(
      toNotification({
        ...answers,
        referenceNumber: 'GBN-1'
      })
    )
  })

  it('Should preserve legacy string animal counts in the posted notification', async () => {
    const answers = {
      commodityLines: [
        {
          commoditySelection: 'Cow',
          speciesSelection: '1148346',
          numberOfAnimalsQuantity: '5',
          numberOfPackages: '2'
        }
      ]
    }

    await records.replaceFulfilment('GBN-1', assembleFulfilments(answers), {
      known: { journeyId: 'GBN-1', status: IN_PROGRESS }
    })

    expect(await fetchMocker.requests()[0].clone().json()).toEqual(
      toNotification({
        ...answers,
        referenceNumber: 'GBN-1'
      })
    )
  })
})
