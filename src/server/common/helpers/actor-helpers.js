export function buildActor(credentials) {
  const isB2C = Boolean(credentials.contactId)
  const actor = {
    id: isB2C ? credentials.contactId : credentials.sub,
    source: isB2C ? 'dynamics-contact' : 'entra-oid',
    userType: isB2C ? 'B2C' : 'B2B',
    displayName: credentials.name,
    organisationId: credentials.currentRelationshipId
  }
  if (credentials.onBehalfOfOrganisationId) {
    actor.onBehalfOfOrganisationId = credentials.onBehalfOfOrganisationId
  }
  return actor
}
