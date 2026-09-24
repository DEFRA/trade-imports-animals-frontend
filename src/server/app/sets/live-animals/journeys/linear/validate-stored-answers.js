import * as addressBook from '../../../../services/address-book/index.js'
import { CONTACT_PARTY, PARTIES } from './features/addresses/parties.js'
import { revalidators } from './revalidators.js'

// Every party role that stores an address-book reference — the five
// PARTIES roles plus the contact-address role. Ids the aggregator
// pre-resolves so each hook reads from ctx rather than re-fetching.
const ADDRESS_ROLES = [...PARTIES, CONTACT_PARTY]

const addressIdsIn = (answers) =>
  ADDRESS_ROLES.map((party) => answers?.[party.id]?.addressId).filter(Boolean)

export const buildValidationContext = async (answers, { orgId }) => {
  const addressStatuses = await addressBook.addressStatusByIds(
    orgId,
    addressIdsIn(answers)
  )
  return { addressStatuses }
}

export const validateAllStored = async (answers, { orgId }) => {
  const ctx = await buildValidationContext(answers, { orgId })
  const perPage = await Promise.all(
    revalidators.map(async ({ id, run }) => ({
      id,
      errors: await run(answers, ctx)
    }))
  )
  return perPage.filter(({ errors }) => Object.keys(errors ?? {}).length > 0)
}
