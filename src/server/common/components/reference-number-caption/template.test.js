import { renderComponent } from '../../test-helpers/component-helpers.js'

describe('Reference Number Caption Component', () => {
  describe('With a reference number', () => {
    let $component

    beforeEach(() => {
      $component = renderComponent('reference-number-caption', {
        referenceNumber: 'GBCHD2024.1234567'
      })
    })

    test('Should render the caption element', () => {
      expect(
        $component('[data-testid="app-reference-number-caption"]')
      ).toHaveLength(1)
    })

    test('Should contain the reference number value', () => {
      expect(
        $component('[data-testid="app-reference-number-caption"]').text().trim()
      ).toBe('GBCHD2024.1234567')
    })
  })

  describe('Without a reference number', () => {
    let $component

    beforeEach(() => {
      $component = renderComponent('reference-number-caption', {})
    })

    test('Should not render the caption element', () => {
      expect(
        $component('[data-testid="app-reference-number-caption"]')
      ).toHaveLength(0)
    })
  })
})
