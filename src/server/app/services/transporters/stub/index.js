const OBJECT_ID_LENGTH = 24

const transportersByOrganisation = new Map()

const newObjectId = () =>
  crypto.randomUUID().replaceAll('-', '').slice(0, OBJECT_ID_LENGTH)

/** The organisation's transporters, newest first — what `STUB_MODE=true`
 * serves in place of the address book. */
export const listTransporters = async (orgId) =>
  [...(transportersByOrganisation.get(orgId)?.values() ?? [])].reverse()

export const createTransporter = async (orgId, transporter) => {
  const created = {
    id: newObjectId(),
    organisationId: orgId,
    deleted: false,
    ...transporter
  }
  const records = transportersByOrganisation.get(orgId) ?? new Map()
  records.set(created.id, created)
  transportersByOrganisation.set(orgId, records)
  return created
}

/** Empty the store. For tests, which share one module instance and would
 * otherwise read each other's transporters. */
export const forgetStubTransporters = () => transportersByOrganisation.clear()
