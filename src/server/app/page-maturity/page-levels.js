import { LEVELS } from './levels.js'

const NOTIFICATION = '/live-animals/notifications/{journeyId}'

export const PAGE_LEVELS = Object.freeze({
  '/live-animals': LEVELS.exploring,
  [NOTIFICATION]: LEVELS.exploring,
  [`${NOTIFICATION}/origin`]: LEVELS.exploring,
  [`${NOTIFICATION}/commodities`]: LEVELS.exploring,
  [`${NOTIFICATION}/import-reason`]: LEVELS.exploring,
  [`${NOTIFICATION}/consignment-details`]: LEVELS.exploring,
  [`${NOTIFICATION}/commodities/identification`]: LEVELS.exploring,
  [`${NOTIFICATION}/additional-details`]: LEVELS.exploring,
  [`${NOTIFICATION}/addresses`]: LEVELS.exploring,
  [`${NOTIFICATION}/cph-number`]: LEVELS.exploring,
  [`${NOTIFICATION}/consignment/contact/select`]: LEVELS.exploring,
  [`${NOTIFICATION}/port-of-entry`]: LEVELS.exploring,
  [`${NOTIFICATION}/transit-countries`]: LEVELS.detailing,
  [`${NOTIFICATION}/transporters`]: LEVELS.exploring,
  [`${NOTIFICATION}/accompanying-documents`]: LEVELS.exploring,
  [`${NOTIFICATION}/notification-view`]: LEVELS.exploring,
  [`${NOTIFICATION}/declaration`]: LEVELS.agreed,
  [`${NOTIFICATION}/confirmation`]: LEVELS.readyForLive
})

export const SECTION_LEVELS = Object.freeze([
  Object.freeze({ section: '/live-animals/templates', level: LEVELS.exploring })
])
