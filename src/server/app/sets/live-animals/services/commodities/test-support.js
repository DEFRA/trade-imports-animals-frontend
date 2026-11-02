import { afterEach, beforeEach, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

export const fetchMocker = createFetchMock(vi)

export const FERRET_RESULTS = {
  total: 1,
  page: 0,
  size: 10,
  groups: [
    {
      code: '01061900',
      species: [{ latinName: 'Mustela putorius furo', commonName: 'Ferret' }]
    }
  ]
}

export const mockFetchEachTest = () => {
  beforeEach(() => {
    fetchMocker.enableMocks()
    fetchMocker.resetMocks()
  })

  afterEach(() => {
    fetchMocker.disableMocks()
  })
}

export const respondWith = (status, statusText) =>
  fetchMocker.mockResponse(() => ({ status, statusText, body: '' }))

export const respondWithJson = (body) =>
  fetchMocker.mockResponse(JSON.stringify(body))

export const firstRequest = () => fetchMocker.requests()[0]
