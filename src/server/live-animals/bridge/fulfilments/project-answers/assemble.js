import { setAt } from '../../../lib/path.js'
import { fulfilmentIdToPath } from '../fulfilment-id-path.js'

export const answersWithScalar = (answers, name, stored) =>
  setAt(answers, [name], stored)

export const answersWithRecords = (answers, chain, name, records) =>
  records.reduce(
    (acc, [fulfilmentId, value]) =>
      setAt(acc, fulfilmentIdToPath(chain, fulfilmentId, name), value),
    answers
  )
