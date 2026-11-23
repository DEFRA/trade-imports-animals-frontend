import { FIRST_PAGE } from './view-model/pagination.js'

export const pageNumber = (value) => {
  const requested = Number.parseInt(value ?? '', 10)
  return Number.isInteger(requested) && requested >= FIRST_PAGE
    ? requested
    : FIRST_PAGE
}

export const isSearchAction = (payload) => payload.action === 'search'
