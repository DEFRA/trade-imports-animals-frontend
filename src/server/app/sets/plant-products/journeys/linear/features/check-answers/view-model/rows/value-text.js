import { isBlank } from '../../../../../../../../lib/answered.js'
import {
  classLabelFor,
  varietyLabelFor
} from '../../../../../../services/commodities/index.js'
import {
  bcpLabel,
  controlPointLabel
} from '../../../../../../services/reference/bcps.js'
import { countryLabel } from '../../../../../../services/reference/countries.js'
import { documentTypeLabel } from '../../../../../../services/reference/document-types.js'
import { grossVolumeUnitLabel } from '../../../../../../services/reference/gross-volume-units.js'
import { packageTypeLabel } from '../../../../../../services/reference/package-types.js'
import { purposeLabel } from '../../../../../../services/reference/purposes.js'
import { quantityTypeLabel } from '../../../../../../services/reference/quantity-types.js'
import { meansOfTransportLabel } from '../../../../../../services/reference/transport-options.js'

export const valueText = (value) => {
  if (isBlank(value)) {
    return ''
  }
  if (typeof value === 'number') {
    return String(value)
  }
  return value
}

export const labelFor = (lookup, value) => lookup(value) ?? value ?? ''
export const countryText = (value) => labelFor(countryLabel, value)
export const bcpText = (value) => labelFor(bcpLabel, value)
export const controlPointText = (value) => labelFor(controlPointLabel, value)
export const documentTypeText = (value) => labelFor(documentTypeLabel, value)
export const grossVolumeUnitText = (value) =>
  labelFor(grossVolumeUnitLabel, value)
export const packageTypeText = (value) => labelFor(packageTypeLabel, value)
export const purposeText = (value) => labelFor(purposeLabel, value)
export const quantityTypeText = (value) => labelFor(quantityTypeLabel, value)
export const transportText = (value) => labelFor(meansOfTransportLabel, value)
export const varietyText = (commodityCode, eppoCode, value) =>
  varietyLabelFor(commodityCode, eppoCode, value) ?? value ?? ''
export const classText = (value) => classLabelFor(value) ?? value ?? ''

export const yesNoText = (value, copy) =>
  value === true ? copy.yes : value === false ? copy.no : ''

export const dateText = (value) => {
  if (isBlank(value)) {
    return ''
  }
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    return match ? `${Number(match[3])}/${Number(match[2])}/${match[1]}` : value
  }
  return `${value.day}/${value.month}/${value.year}`
}

export const timeText = (value) => (isBlank(value) ? '' : String(value))

export const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
