import { describe, expect, it } from 'vitest'

import { withOrganisationId } from '../../../../../../common/helpers/organisation-id.js'
import { headers, ORGANISATION_ID_HEADER } from './headers.js'

describe('notification backend headers', () => {
  it('Should send the bound organisation id', () => {
    withOrganisationId('5900042', () => {
      expect(headers()[ORGANISATION_ID_HEADER]).toBe('5900042')
    })
  })

  it('Should refuse to call the backend without a session organisation', () => {
    expect(() => headers()).toThrow(
      /Cannot reach the notifications backend without an organisation from the signed-in session/
    )
  })
})
