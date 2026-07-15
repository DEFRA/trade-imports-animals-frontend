import { describe, expect, test, vi } from 'vitest'
import { addOperatorTypeController } from './controller.js'

function mockToolkit() {
  const response = {
    code(statusCode) {
      this.statusCode = statusCode
      return this
    }
  }
  return {
    view: vi.fn((template, data) =>
      Object.assign({ template, data }, response)
    ),
    redirect: vi.fn((location) => ({ location }))
  }
}

describe('addOperatorTypeController', () => {
  describe('GET /address-book/add', () => {
    test('renders the seven operator types in Jira order with an "or" divider before Branch address', () => {
      const h = mockToolkit()
      const response = addOperatorTypeController.get.handler({}, h)

      const items = response.data.typeItems
      const values = items.map((item) => item.value ?? '__divider__')

      expect(values).toEqual([
        'PLACE_OF_ORIGIN',
        'CONSIGNOR',
        'CONSIGNEE',
        'IMPORTER',
        'PLACE_OF_DESTINATION',
        'TRANSPORTER',
        '__divider__',
        'BRANCH_ADDRESS'
      ])

      const divider = items.find((item) => item.divider)
      expect(divider).toEqual({ divider: 'or' })
    })

    test('carries the per-type hint copy through to the radio items', () => {
      const h = mockToolkit()
      const response = addOperatorTypeController.get.handler({}, h)

      const transporter = response.data.typeItems.find(
        (item) => item.value === 'TRANSPORTER'
      )
      expect(transporter.hint.text).toBe(
        'The person or company responsible for transporting the consignment'
      )
    })
  })

  describe('POST /address-book/add', () => {
    test('re-renders with an error summary when no type is selected (b-004)', () => {
      const h = mockToolkit()
      const response = addOperatorTypeController.post.handler(
        { payload: {} },
        h
      )

      expect(response.template).toBe('address-book/add/type/index')
      expect(response.statusCode).toBe(400)
      expect(response.data.errorList).toEqual([
        { text: 'Select an operator type', href: '#operatorType' }
      ])
      expect(response.data.fieldErrors.operatorType).toEqual({
        text: 'Select an operator type'
      })
      expect(h.redirect).not.toHaveBeenCalled()
    })

    test('re-renders with an error when an unknown type is posted', () => {
      const h = mockToolkit()
      const response = addOperatorTypeController.post.handler(
        { payload: { operatorType: 'NONSENSE' } },
        h
      )

      expect(response.statusCode).toBe(400)
      expect(response.data.errorList[0].text).toBe('Select an operator type')
    })

    test('redirects to the details page carrying the chosen type on a valid selection', () => {
      const h = mockToolkit()
      const response = addOperatorTypeController.post.handler(
        { payload: { operatorType: 'TRANSPORTER' } },
        h
      )

      expect(h.redirect).toHaveBeenCalledWith(
        '/address-book/add/details?operator_type=TRANSPORTER'
      )
      expect(response.location).toBe(
        '/address-book/add/details?operator_type=TRANSPORTER'
      )
    })
  })
})
