import { fail } from '../fail.js'

export const validateObligationId = (obligationId) => {
  if (typeof obligationId !== 'string' || obligationId.length === 0) {
    fail('obligationId must be a non-empty string')
  }
}
