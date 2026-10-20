/**
 * Measures the joined search button beside an enhanced type-ahead input.
 *
 * @param {import('@playwright/test').Locator} input - the enhanced search box.
 * @returns {Promise<object>} the box and button edges, and the button's look.
 */
export const measureJoinedSearchButton = (input) =>
  input.evaluate((inputElement) => {
    const container = inputElement.closest('.app-autocomplete')
    const button = container.querySelector('.app-autocomplete__button')
    const arrow = container.querySelector('.autocomplete__dropdown-arrow-down')
    const inputEdges = inputElement.getBoundingClientRect()
    const buttonEdges = button.getBoundingClientRect()
    const buttonStyle = window.getComputedStyle(button)
    return {
      arrowDisplay: window.getComputedStyle(arrow).display,
      inputTop: inputEdges.top,
      inputBottom: inputEdges.bottom,
      inputRight: inputEdges.right,
      buttonTop: buttonEdges.top,
      buttonBottom: buttonEdges.bottom,
      buttonRight: buttonEdges.right,
      buttonWidth: buttonEdges.width,
      buttonHeight: buttonEdges.height,
      background: buttonStyle.backgroundColor,
      boxShadow: buttonStyle.boxShadow,
      borderWidth: buttonStyle.borderTopWidth,
      iconColour: window.getComputedStyle(button, '::before').backgroundColor
    }
  })

/**
 * Measures the open suggestion list against the joined control it belongs to.
 *
 * @param {import('@playwright/test').Locator} input - the enhanced search box.
 * @returns {Promise<{ listWidth: number, controlWidth: number }>}
 */
export const suggestionListWidthsOf = (input) =>
  input.evaluate((inputElement) => {
    const container = inputElement.closest('.app-autocomplete')
    return {
      listWidth: container
        .querySelector('.autocomplete__menu')
        .getBoundingClientRect().width,
      controlWidth: container.getBoundingClientRect().width
    }
  })

/**
 * The letters shown in bold in one suggestion.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} suggestionName - the suggestion's accessible name.
 * @returns {Promise<string[]>}
 */
export const boldLettersOf = (page, suggestionName) =>
  page
    .getByRole('option', { name: suggestionName, exact: true })
    .locator('strong')
    .allTextContents()
