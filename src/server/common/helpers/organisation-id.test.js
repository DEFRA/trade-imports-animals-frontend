import { describe, expect, it } from 'vitest'

import {
  currentOrganisationId,
  organisationIdOf,
  withOrganisationId
} from './organisation-id.js'

describe('organisationIdOf', () => {
  it('Should read organisationId from verified session credentials', () => {
    expect(
      organisationIdOf({
        auth: { credentials: { organisationId: '5900001' } }
      })
    ).toBe('5900001')
  })

  it('Should return undefined when organisationId is absent', () => {
    expect(
      organisationIdOf({
        auth: { credentials: { currentRelationshipId: '5900002' } }
      })
    ).toBeUndefined()
  })

  it('Should return undefined when the request is unauthenticated', () => {
    expect(organisationIdOf({})).toBeUndefined()
    expect(organisationIdOf(null)).toBeUndefined()
    expect(organisationIdOf(undefined)).toBeUndefined()
  })
})

describe('withOrganisationId', () => {
  it('Should scope currentOrganisationId to the callback and return its result', () => {
    expect(currentOrganisationId()).toBeUndefined()

    const returned = withOrganisationId('org-scoped', () => {
      expect(currentOrganisationId()).toBe('org-scoped')
      return 'done'
    })

    expect(returned).toBe('done')
    expect(currentOrganisationId()).toBeUndefined()
  })
})
