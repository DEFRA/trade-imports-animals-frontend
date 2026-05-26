/**
 * Sort aliases used on the dashboard URL (`?sort=...`). The backend takes
 * a Mongo field path in `sort` and a separate `direction` (asc|desc); we
 * keep that mapping out of URLs and the view layer.
 */
export const NOTIFICATION_SORT_VALUES = Object.freeze({
  arrivalDesc: 'arrivalDate-desc',
  arrivalAsc: 'arrivalDate-asc',
  createdDesc: 'createdDate-desc',
  createdAsc: 'createdDate-asc'
})

export const DEFAULT_SORT = NOTIFICATION_SORT_VALUES.arrivalDesc

export const NOTIFICATION_SORT_OPTIONS = Object.freeze([
  {
    value: NOTIFICATION_SORT_VALUES.arrivalDesc,
    text: 'Arrival (newest to oldest)'
  },
  {
    value: NOTIFICATION_SORT_VALUES.arrivalAsc,
    text: 'Arrival (oldest to newest)'
  },
  {
    value: NOTIFICATION_SORT_VALUES.createdDesc,
    text: 'Date created (newest to oldest)'
  },
  {
    value: NOTIFICATION_SORT_VALUES.createdAsc,
    text: 'Date created (oldest to newest)'
  }
])

export const SORT_TO_BACKEND = Object.freeze({
  [NOTIFICATION_SORT_VALUES.arrivalDesc]: {
    sort: 'transport.arrivalDate',
    direction: 'desc'
  },
  [NOTIFICATION_SORT_VALUES.arrivalAsc]: {
    sort: 'transport.arrivalDate',
    direction: 'asc'
  },
  [NOTIFICATION_SORT_VALUES.createdDesc]: {
    sort: 'created',
    direction: 'desc'
  },
  [NOTIFICATION_SORT_VALUES.createdAsc]: {
    sort: 'created',
    direction: 'asc'
  }
})
