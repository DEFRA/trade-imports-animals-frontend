// @vitest-environment jsdom

import AccessibleAutocomplete from './accessible-autocomplete.js'

const enhanced = vi.hoisted(() => ({ config: null }))

vi.mock('accessible-autocomplete', () => ({
  default: {
    enhanceSelectElement: (config) => {
      enhanced.config = config
      const { selectElement } = config
      const container = document.createElement('div')
      container.innerHTML = `<div class="autocomplete__wrapper"><input id="${selectElement.id}" class="autocomplete__input" type="text"></div>`
      selectElement.parentNode.insertBefore(container, selectElement)
      selectElement.id = `${selectElement.id}-select`
    }
  }
}))

const SELECT_WITH_COUNTRIES = `
  <form>
    <select id="countryOfOrigin" name="countryOfOrigin" aria-describedby="countryOfOrigin-hint">
      <option value="">Select a country</option>
      <option value="FR">France</option>
      <option value="DE">Germany</option>
      <option value="CI">Côte d'Ivoire</option>
    </select>
  </form>
`

const enhance = (select) => new AccessibleAutocomplete(select)

const enhanceCountrySelect = (dataset = {}) => {
  document.body.innerHTML = SELECT_WITH_COUNTRIES
  const select = document.querySelector('select')
  Object.assign(select.dataset, dataset)
  enhance(select)
  return {
    select,
    form: document.querySelector('form'),
    input: document.getElementById('countryOfOrigin'),
    config: enhanced.config
  }
}

const suggestionAfterTyping = (config, query, suggestion) => {
  config.source(query, () => {})
  return config.templates.suggestion(suggestion)
}

const countChangeEvents = (form) => {
  const changes = []
  form.addEventListener('change', (event) => changes.push(event.target))
  return changes
}

describe('AccessibleAutocomplete', () => {
  describe('placeholder', () => {
    it('Should hand the library the placeholder text the page gave', () => {
      const { config } = enhanceCountrySelect({
        placeholder: 'Search for a country'
      })

      expect(config.placeholder).toBe('Search for a country')
    })

    it('Should leave the library placeholder alone when the page gave none', () => {
      const { config } = enhanceCountrySelect({ placeholder: '' })

      expect(config).not.toHaveProperty('placeholder')
    })
  })

  describe('suggestions', () => {
    it('Should list only the options that have a value, matching what was typed in any case', () => {
      const { config } = enhanceCountrySelect()
      const listed = []

      config.source('  FR ', (results) => listed.push(...results))

      expect(listed).toEqual(['France'])
    })

    it('Should offer an accented option for plain letters and bold its accented letters', () => {
      const { config } = enhanceCountrySelect()
      const listed = []

      config.source('cote', (results) => listed.push(...results))

      expect(listed).toEqual(["Côte d'Ivoire"])
      expect(config.templates.suggestion("Côte d'Ivoire")).toBe(
        '<strong class="app-autocomplete__match">Côte</strong> d&#39;Ivoire'
      )
    })

    it('Should bold the typed letters in the case the suggestion is written in', () => {
      const { config } = enhanceCountrySelect()

      expect(suggestionAfterTyping(config, 'fra', 'France')).toBe(
        '<strong class="app-autocomplete__match">Fra</strong>nce'
      )
      expect(suggestionAfterTyping(config, 'an', 'Banana')).toBe(
        'B<strong class="app-autocomplete__match">an</strong><strong class="app-autocomplete__match">an</strong>a'
      )
    })

    it('Should bold nothing when the box is empty', () => {
      const { config } = enhanceCountrySelect()

      expect(suggestionAfterTyping(config, '', 'France')).toBe('France')
    })

    it('Should keep the query of each type-ahead to itself', () => {
      const first = enhanceCountrySelect().config
      const second = enhanceCountrySelect().config

      first.source('fra', () => {})
      second.source('ger', () => {})

      expect(first.templates.suggestion('France')).toBe(
        '<strong class="app-autocomplete__match">Fra</strong>nce'
      )
      expect(second.templates.suggestion('France')).toBe('France')
    })

    it('Should show markup characters in a suggestion exactly as written', () => {
      const { config } = enhanceCountrySelect()

      expect(suggestionAfterTyping(config, '', '<b>R&D</b>')).toBe(
        '&lt;b&gt;R&amp;D&lt;/b&gt;'
      )
    })

    it('Should bold a typed ampersand and not match the letters of its escape', () => {
      const { config } = enhanceCountrySelect()

      expect(suggestionAfterTyping(config, '&', 'R&D')).toBe(
        'R<strong class="app-autocomplete__match">&amp;</strong>D'
      )
      expect(suggestionAfterTyping(config, 'amp', 'R&D')).toBe('R&amp;D')
    })

    it('Should bold a typed bracket as text, not as a pattern', () => {
      const { config } = enhanceCountrySelect()

      expect(suggestionAfterTyping(config, '(', 'Congo (Brazzaville)')).toBe(
        'Congo <strong class="app-autocomplete__match">(</strong>Brazzaville)'
      )
    })
  })

  describe('confirming a choice', () => {
    it('Should select the option and send one bubbling change when a suggestion is chosen', () => {
      const { select, form, config } = enhanceCountrySelect()
      const changes = countChangeEvents(form)

      config.onConfirm('France')

      expect(select.value).toBe('FR')
      expect(changes).toEqual([select])
    })

    it('Should select the option the box holds when the box is left on an exact match', () => {
      const { select, form, input, config } = enhanceCountrySelect()
      const changes = countChangeEvents(form)
      input.value = 'Germany'

      config.onConfirm(undefined)

      expect(select.value).toBe('DE')
      expect(changes).toEqual([select])
    })

    it('Should send a change when the box is left on text that matches nothing and the choice clears', () => {
      const { select, form, input, config } = enhanceCountrySelect()
      config.onConfirm('France')
      const changes = countChangeEvents(form)
      input.value = 'Fran'

      config.onConfirm(undefined)

      expect(select.value).toBe('')
      expect(changes).toEqual([select])
    })

    it('Should send nothing when the box is left with the choice unchanged', () => {
      const { select, form, input, config } = enhanceCountrySelect()
      config.onConfirm('Germany')
      const changes = countChangeEvents(form)
      input.value = 'Germany'

      config.onConfirm(undefined)

      expect(select.value).toBe('DE')
      expect(changes).toEqual([])
    })
  })

  describe('joined search button', () => {
    it('Should add one decorative button that assistive technology and the tab order skip', () => {
      enhanceCountrySelect()

      const buttons = document.querySelectorAll('.app-autocomplete__button')

      expect(buttons).toHaveLength(1)
      expect(buttons[0].getAttribute('aria-hidden')).toBe('true')
      expect(buttons[0].tagName).toBe('SPAN')
      expect(buttons[0].hasAttribute('tabindex')).toBe(false)
    })

    it('Should put focus in the box when the button is clicked', () => {
      const { input } = enhanceCountrySelect()

      document.querySelector('.app-autocomplete__button').click()

      expect(document.activeElement).toBe(input)
    })
  })

  describe('aria-describedby', () => {
    it('Should carry the select hint onto the enhanced box', () => {
      const { select, input } = enhanceCountrySelect()

      expect(input.getAttribute('aria-describedby')).toBe(
        'countryOfOrigin-hint'
      )
      expect(select.getAttribute('aria-describedby')).toBe('')
    })
  })
})
