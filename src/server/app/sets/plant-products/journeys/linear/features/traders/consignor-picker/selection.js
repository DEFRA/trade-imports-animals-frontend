import { readSelection } from '../../../../../services/address-book/session-store.js'
import { candidates, NOTIFICATION_CONSIGNOR_ID } from './candidates.js'

// Plant carries the chosen id explicitly through the session, so nothing here
// ever matches on name — a name collision must not select a record.
const preferences = (request, journeyId, answers) =>
  [
    request?.query?.selected,
    readSelection(request, journeyId),
    String(answers?.consignorName ?? '').trim() !== ''
      ? NOTIFICATION_CONSIGNOR_ID
      : undefined
  ].filter((id) => id)

// A consignor just created on the form is recorded in the session under its
// address-book id, but candidates() collapses it into the notification's own
// row. Resolving the chain against the rows actually on offer keeps that
// selection visible instead of silently dropping it.
export const selectedId = (request, journeyId, answers, records = []) => {
  const offered = new Set(records.map((record) => record.id))
  const preferred = preferences(request, journeyId, answers)
  return preferred.find((id) => offered.has(id)) ?? preferred[0]
}

export const chosenFor = async (request, answers, postedId) => {
  if (!postedId) return undefined
  const pickable = await candidates(request, answers)
  return pickable.find((record) => record.id === postedId)
}
