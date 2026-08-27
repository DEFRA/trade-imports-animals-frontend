import { setAt } from '../../../lib/path.js'
import { fulfilmentIndexToPath } from '../fulfilment-id-path.js'

export const answersWithScalar = (answers, name, stored) =>
  setAt(answers, [name], stored)

export const answersWithRecords = (answers, chain, name, records) =>
  records.reduce(
    (acc, [fulfilmentIndex, value]) =>
      setAt(acc, fulfilmentIndexToPath(chain, fulfilmentIndex, name), value),
    answers
  )
