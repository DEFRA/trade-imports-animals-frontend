import { buildActor } from './actor-helpers.js'

describe('buildActor', () => {
  const baseCredentials = {
    contactId: 2100010101,
    sub: 'entra-oid-001',
    name: 'Jane Farmer',
    currentRelationshipId: 'org-001'
  }

  it('builds a B2C actor when contactId is present', () => {
    const actor = buildActor(baseCredentials)

    expect(actor).toEqual({
      id: '2100010101',
      source: 'dynamics-contact',
      userType: 'B2C',
      displayName: 'Jane Farmer',
      organisationId: 'org-001'
    })
  })

  it('returns no actor when authentication is disabled', () => {
    expect(buildActor(null)).toBeUndefined()
  })

  it('builds a B2B actor when contactId is absent', () => {
    const credentials = {
      ...baseCredentials,
      contactId: undefined,
      sub: 'entra-oid-001'
    }

    const actor = buildActor(credentials)

    expect(actor).toEqual({
      id: 'entra-oid-001',
      source: 'entra-oid',
      userType: 'B2B',
      displayName: 'Jane Farmer',
      organisationId: 'org-001'
    })
  })

  it('includes onBehalfOfOrganisationId when present on credentials', () => {
    const credentials = {
      ...baseCredentials,
      onBehalfOfOrganisationId: 'importer-org-999'
    }

    const actor = buildActor(credentials)

    expect(actor.onBehalfOfOrganisationId).toBe('importer-org-999')
  })

  it('omits onBehalfOfOrganisationId when absent from credentials', () => {
    const actor = buildActor(baseCredentials)

    expect(actor).not.toHaveProperty('onBehalfOfOrganisationId')
  })
})
