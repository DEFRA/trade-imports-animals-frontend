import { appendEntryAt, updateEntryAt, removeEntryAt } from './mutate.js'

export const appendEntry = async (request, h, obligationId, entry) =>
  appendEntryAt(request, h, [obligationId], entry)

export const updateEntry = async (request, h, obligationId, index, entry) =>
  updateEntryAt(request, h, [obligationId], index, entry)

export const removeEntry = async (request, h, obligationId, index) =>
  removeEntryAt(request, h, [obligationId], index)
