/**
 * Single source of truth for the seven operator types: the UPPER_SNAKE enum
 * value (the wire/session value), its Jira display label, the add-page hint
 * copy, in Jira order (EUDPA-186.AC2 / EUDPA-287.AC1). Reused by the list
 * column, the list type filter and the add type-selection page.
 */
export const OPERATOR_TYPES = [
  {
    value: 'PLACE_OF_ORIGIN',
    label: 'Place of origin',
    hint: 'Where the animals begin their journey to Great Britain'
  },
  {
    value: 'CONSIGNOR',
    label: 'Consignor',
    hint: 'The sender of the consignment'
  },
  {
    value: 'CONSIGNEE',
    label: 'Consignee',
    hint: 'The receiver or buyer of the consignment'
  },
  {
    value: 'IMPORTER',
    label: 'Importer',
    hint: 'Usually the same as the consignee'
  },
  {
    value: 'PLACE_OF_DESTINATION',
    label: 'Place of destination',
    hint: 'Where the animals will be unloaded and accommodated for at least 48 hours'
  },
  {
    value: 'TRANSPORTER',
    label: 'Transporter',
    hint: 'The person or company responsible for transporting the consignment'
  },
  {
    value: 'BRANCH_ADDRESS',
    label: 'Branch address',
    hint: 'The contact address of the person responsible'
  }
]

/**
 * The add type-selection page renders a visual 'or' divider immediately before
 * this type in the radio list.
 */
export const OPERATOR_TYPE_DIVIDER_BEFORE = 'BRANCH_ADDRESS'

const operatorTypeLabels = Object.fromEntries(
  OPERATOR_TYPES.map(({ value, label }) => [value, label])
)

/**
 * Resolve an operator type's display label, falling back to the raw value for
 * an unknown type rather than rendering nothing.
 * @param {string} value - the UPPER_SNAKE operator type
 * @returns {string} the display label
 */
export function operatorTypeLabel(value) {
  return operatorTypeLabels[value] ?? value
}
