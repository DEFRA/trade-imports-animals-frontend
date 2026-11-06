import { describe, expect, it } from 'vitest'

import {
  bindOrganisationId,
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

  it('Should read currentRelationshipId when organisationId is absent', () => {
    expect(
      organisationIdOf({
        auth: { credentials: { currentRelationshipId: '5900002' } }
      })
    ).toBe('5900002')
  })

  it('Should return undefined when the request is unauthenticated', () => {
    expect(organisationIdOf({})).toBeUndefined()
    expect(organisationIdOf(null)).toBeUndefined()
    expect(organisationIdOf(undefined)).toBeUndefined()
  })
})

describe('organisation id binding', () => {
  it('Should expose the value bound for this request', () => {
    bindOrganisationId('5900001')

    expect(currentOrganisationId()).toBe('5900001')
  })

  it('Should scope currentOrganisationId to withOrganisationId', () => {
    withOrganisationId('org-scoped', () => {
      expect(currentOrganisationId()).toBe('org-scoped')
    })
  })
})
