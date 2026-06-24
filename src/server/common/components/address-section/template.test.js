import { renderComponent } from '../../test-helpers/component-helpers.js'

const selectedOperator = {
  name: 'Acme Ltd',
  address: {
    addressLine1: '1 Test Street',
    addressLine2: 'Test Town',
    addressLine3: null,
    country: 'France'
  }
}

const defaultParams = {
  key: 'placeOfOrigin',
  heading: 'Place of origin',
  hint: 'The address where the animals begin their journey to Great Britain',
  href: '/place-of-origin/select',
  addId: 'addPlaceOfOrigin',
  changeId: 'changePlaceOfOrigin',
  selected: null
}

describe('Address Section Component', () => {
  describe('when no operator is selected', () => {
    let $component

    beforeEach(() => {
      $component = renderComponent('address-section', defaultParams)
    })

    test('renders the section heading', () => {
      expect($component('h2').text().trim()).toBe('Place of origin')
    })

    test('renders the hint text', () => {
      expect($component('#placeOfOrigin-hint').text().trim()).toBe(
        'The address where the animals begin their journey to Great Britain'
      )
    })

    test('renders an add link with correct href and id', () => {
      const $link = $component('#addPlaceOfOrigin')
      expect($link).toHaveLength(1)
      expect($link.attr('href')).toBe('/place-of-origin/select')
      expect($link.text().trim()).toBe('Add a place of origin')
    })

    test('does not render a table', () => {
      expect($component('table')).toHaveLength(0)
    })

    test('uses addText override for the add link when provided', () => {
      const $overrideComponent = renderComponent('address-section', {
        ...defaultParams,
        addText: 'Add an importer'
      })
      expect($overrideComponent('#addPlaceOfOrigin').text().trim()).toBe(
        'Add an importer'
      )
    })
  })

  describe('when an operator is selected', () => {
    let $component

    beforeEach(() => {
      $component = renderComponent('address-section', {
        ...defaultParams,
        selected: selectedOperator
      })
    })

    test('renders the operator name in the table', () => {
      expect($component('tbody td').first().text().trim()).toBe('Acme Ltd')
    })

    test('renders the address combining address lines', () => {
      const cells = $component('tbody td')
      expect(cells.eq(1).text().trim()).toBe('1 Test Street, Test Town')
    })

    test('renders the country in the table', () => {
      const cells = $component('tbody td')
      expect(cells.eq(2).text().trim()).toBe('France')
    })

    test('renders a change link with correct href and id', () => {
      const $link = $component('#changePlaceOfOrigin')
      expect($link).toHaveLength(1)
      expect($link.attr('href')).toBe('/place-of-origin/select')
      expect($link.text().trim()).toBe('Change place of origin')
    })

    test('does not render an add link', () => {
      expect($component('#addPlaceOfOrigin')).toHaveLength(0)
    })
  })
})
