import { journeyStrip } from '../../../../../../../../shared/kit.js'
import * as commodities from '../../../../../../services/commodities/index.js'
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
  commodity: formatCommodity(journey.commodity, commodities.commodityNameFor),
  origin: journey.originCountryCode
    ? await countries.originDisplayLabel(journey.originCountryCode)
    : '',
  // arrival is a day the user chose; created and submitted are moments.
  arrival: formatDisplayCalendarDate(journey.arrivalDate),
  consignor: journey.consignorName ?? '',
  consignee: journey.consigneeName ?? '',
  created: formatDisplayMoment(journey.createdAt),
  submitted: formatDisplayMoment(journey.submittedAt),
  actions: rowActions(journey)
})
