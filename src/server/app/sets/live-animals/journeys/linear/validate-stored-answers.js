import * as addressBook from '../../../../services/address-book/index.js'
import { revalidators } from './revalidators.js'

// Ids the aggregator pre-resolves so each hook reads from ctx rather than
// re-fetching. Extractors grow as hooks that need pre-resolved data land.
const addressIdsIn = (answers) =>
  [answers?.contactAddress?.addressId].filter(Boolean)

export const buildValidationContext = async (answers, { orgId }) => {
  const addressResolutions = await addressBook.partiesByIds(
    orgId,
    addressIdsIn(answers)
  )
  return { addressResolutions }
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
