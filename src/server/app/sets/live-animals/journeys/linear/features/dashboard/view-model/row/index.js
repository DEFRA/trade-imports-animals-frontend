import { journeyStrip } from '../../../../../../../../shared/kit.js'
import * as commodities from '../../../../../../services/commodities/index.js'
import * as countries from '../../../../../../../../services/countries/index.js'
import {
  formatCommodity,
  formatDisplayDate
} from '../../notification-helper.js'
import { rowActions } from './actions.js'

export const toRow = (journey, retryCopy = null) => ({
  reference: journey.reference ?? journey.journeyId,
  status: journeyStrip(journey).status,
  commodity: formatCommodity(journey.commodity, commodities.commodityNameFor),
  origin: journey.originCountryCode
    ? (countries.originLabel(journey.originCountryCode) ??
      journey.originCountryCode)
    : '',
  arrival: formatDisplayDate(journey.arrivalDate),
  consignor: journey.consignorName ?? '',
  consignee: journey.consigneeName ?? '',
  created: formatDisplayDate(journey.createdAt),
  submitted: formatDisplayDate(journey.submittedAt),
  actions: rowActions(journey).map((action) =>
    retryCopy?.journeyId === journey.journeyId &&
    action.idempotencyKey !== undefined
      ? { ...action, idempotencyKey: retryCopy.idempotencyKey }
      : action
  )
})
