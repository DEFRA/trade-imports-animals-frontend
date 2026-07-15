import { statusCodes } from '../../../common/constants/status-codes.js'
import {
  OPERATOR_TYPES,
  OPERATOR_TYPE_DIVIDER_BEFORE
} from '../../constants/operator-types.js'

const PAGE_TITLE = 'Add a new operator'
const VIEW = 'address-book/add/type/index'
const SELECT_TYPE_MESSAGE = 'Select an operator type'

const validTypes = new Set(OPERATOR_TYPES.map(({ value }) => value))

function buildTypeItems(selectedType) {
  const items = []

  for (const { value, label, hint } of OPERATOR_TYPES) {
    if (value === OPERATOR_TYPE_DIVIDER_BEFORE) {
      items.push({ divider: 'or' })
    }
    items.push({
      value,
      text: label,
      hint: { text: hint },
      checked: value === selectedType
    })
  }

  return items
}

/**
 * Add-an-operator type-selection page — GET+POST /address-book/add.
 */
export const addOperatorTypeController = {
  get: {
    handler(_request, h) {
      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        heading: PAGE_TITLE,
        typeItems: buildTypeItems()
      })
    }
  },
  post: {
    handler(request, h) {
      const operatorType = request.payload?.operatorType

      if (!validTypes.has(operatorType)) {
        return h
          .view(VIEW, {
            pageTitle: PAGE_TITLE,
            heading: PAGE_TITLE,
            typeItems: buildTypeItems(operatorType),
            errorList: [{ text: SELECT_TYPE_MESSAGE, href: '#operatorType' }],
            fieldErrors: { operatorType: { text: SELECT_TYPE_MESSAGE } }
          })
          .code(statusCodes.badRequest)
      }

      return h.redirect(
        `/address-book/add/details?operator_type=${operatorType}`
      )
    }
  }
}
