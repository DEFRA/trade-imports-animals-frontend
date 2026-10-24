import { journeyStrip } from '../../../../../../../../shared/kit.js'
import * as countries from '../../../../../../../../services/countries/index.js'
import {
  formatCommodity,
  formatDisplayCalendarDate,
  formatDisplayMoment
} from '../../notification-helper.js'
import { rowActions } from './actions.js'

export const toRow = async (journey) => ({
  reference: journey.reference ?? journey.journeyId,
  status: journeyStrip(journey).status,
  commodity: formatCommodity(journey.commodity),
  origin: journey.originCountryCode
    ? await countries.countryDisplayLabel(journey.originCountryCode)
    : '',
  arrival: formatDisplayCalendarDate(journey.arrivalDate),
  consignor: journey.consignorName ?? '',
  consignee: journey.consigneeName ?? '',
  created: formatDisplayMoment(journey.createdAt),
  submitted: formatDisplayMoment(journey.submittedAt),
  actions: rowActions(journey)
})
