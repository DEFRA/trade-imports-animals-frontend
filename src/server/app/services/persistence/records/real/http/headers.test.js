import { afterEach, describe, expect, it, vi } from 'vitest'

import { bindOrganisationId } from '../../../../../../common/helpers/organisation-id.js'
import { headers, ORGANISATION_ID_HEADER } from './headers.js'

describe('notification backend headers', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    bindOrganisationId(undefined)
  })

  it('Should send the bound organisation id', () => {
    bindOrganisationId('5900042')

    expect(headers()[ORGANISATION_ID_HEADER]).toBe('5900042')
  })

  it('Should fall back to the test default organisation in test env', () => {
    bindOrganisationId(undefined)

    expect(headers()[ORGANISATION_ID_HEADER]).toBe('5900001')
  })

  it('Should refuse to call the backend without a session organisation outside test', () => {
    vi.stubEnv('NODE_ENV', 'production')
    bindOrganisationId(undefined)

    expect(() => headers()).toThrow(
      /Cannot reach the notifications backend without an organisation from the signed-in session/
    )
  })
})
