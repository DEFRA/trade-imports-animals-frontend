import { DELETED } from '../../../../../engine/persistence/records.js'
import { byUser, journeys } from '../store/state.js'
import { marshal } from '../marshal/document.js'
import { marshalListItem } from '../marshal/list-item.js'
import { LIST_PAGE_SIZE, sortByCreatedAt, validPage } from '../list-query.js'

export const load = async ({ journeyId, userId, owner: _owner } = {}) => {
  const resolvedJourneyId =
    journeyId ?? (userId != null ? byUser.get(userId) : undefined)
  if (resolvedJourneyId == null) return undefined
  const journey = journeys.get(resolvedJourneyId)
  return journey ? structuredClone(marshal(journey)) : undefined
}

export const list = async ({
  journeyIds = [],
  owner: _owner,
  page = 1,
  sort = 'arrivalDate,desc'
} = {}) => {
  const resolvedPage = validPage(page)
  const rows = journeyIds
    .map((journeyId) => journeys.get(journeyId))
    .filter((journey) => journey && journey.status !== DELETED)
    .map(marshalListItem)
    .sort(sortByCreatedAt(sort))
  const totalElements = rows.length
  const totalPages = Math.ceil(totalElements / LIST_PAGE_SIZE)
  const offset = (resolvedPage - 1) * LIST_PAGE_SIZE

  return {
    rows: structuredClone(rows.slice(offset, offset + LIST_PAGE_SIZE)),
    page: resolvedPage,
    size: LIST_PAGE_SIZE,
    totalElements,
    totalPages
  }
}

export const has = async (journeyId) => {
  return journeys.has(journeyId)
}
