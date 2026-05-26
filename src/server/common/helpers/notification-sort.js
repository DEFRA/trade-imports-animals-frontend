import {
  DEFAULT_SORT,
  SORT_TO_BACKEND
} from '../constants/notification-sort.js'

/**
 * Returns one of the four allowed sort aliases, falling back to the default
 * for missing or unknown input. Keeping this strict prevents arbitrary
 * `?sort=...` values from reaching the backend (which would 400 on an
 * unexpected direction).
 */
export function parseSort(raw) {
  return Object.hasOwn(SORT_TO_BACKEND, raw) ? raw : DEFAULT_SORT
}

/**
 * Maps a sort alias to the backend's `{ sort, direction }` shape.
 * Assumes `value` has already passed through `parseSort`.
 */
export function toBackendSortParams(value) {
  return SORT_TO_BACKEND[value]
}
