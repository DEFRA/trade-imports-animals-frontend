import { renderComponent } from '../../test-helpers/component-helpers.js'

describe('Heading Component', () => {
  let $heading

  describe('With caption', () => {
    beforeEach(() => {
      $heading = renderComponent('heading', {
        heading: 'Services',
        caption: 'A page showing available services'
      })
    })

    test('Should render app heading component', () => {
      expect($heading('[data-testid="app-heading"]')).toHaveLength(1)
    })

    test('Should contain expected heading', () => {
      const $title = $heading('[data-testid="app-heading-title"]').clone()
      $title.find('[data-testid="app-heading-caption"]').remove()
      expect($title.text().trim()).toBe('Services')
    })

    test('Should have expected heading caption', () => {
      expect(
        $heading('[data-testid="app-heading-caption"]').text().trim()
      ).toBe('A page showing available services')
    })
  })

  describe('With page title', () => {
    beforeEach(() => {
      $heading = renderComponent('heading', {
        pageTitle: 'Transport',
        heading: 'Search for an existing transporter'
      })
    })

    test('Should render page title as caption within the heading', () => {
      expect(
        $heading('[data-testid="app-heading-title"] .govuk-caption-l')
          .text()
          .trim()
      ).toBe('Transport')
    })

    test('Should contain expected heading text', () => {
      const $title = $heading('[data-testid="app-heading-title"]').clone()
      $title.find('.govuk-caption-l').remove()
      expect($title.text().trim()).toBe('Search for an existing transporter')
    })
  })
})
