/*
 * Accessible autocomplete — progressive enhancement for a native <select>.
 *
 * Adapted from HMRC Frontend's accessible-autocomplete component:
 *   https://github.com/hmrc/hmrc-frontend
 *   src/components/accessible-autocomplete/accessible-autocomplete.js
 *   Pinned commit: 8aba9fc0b60a193d69fea0d3435a5b504cb922c4
 *
 * Copyright (c) 2018 HM Revenue & Customs
 * Licensed under the Apache License, Version 2.0. See NOTICE for details.
 *
 * This file has been modified from the original.
 */
import accessibleAutocomplete from 'accessible-autocomplete'
import { escapeAndBoldMatches } from '../../common/helpers/bold-matches.js'
import { containsTerm } from '../../common/helpers/search-fold.js'

const ARIA_DESCRIBEDBY = 'aria-describedby'
const CONTAINER_CLASS = 'app-autocomplete'
const BUTTON_CLASS = 'app-autocomplete__button'
const LIBRARY_WRAPPER_CLASS = 'autocomplete__wrapper'

const createSuggestionSearch = (values) => {
  let lastQuery = ''
  return {
    source: (query, syncResults) => {
      lastQuery = query
      syncResults(values.filter((value) => containsTerm(value, lastQuery)))
    },
    suggestionTemplate: (suggestion) =>
      escapeAndBoldMatches(suggestion, lastQuery)
  }
}

const welshText = (noResults) => ({
  tAssistiveHint: () =>
    "Pan fydd canlyniadau awtogwblhau ar gael, defnyddiwch y saethau i fyny ac i lawr i'w hadolygu a phwyswch y fysell 'enter' i'w dewis. Gall defnyddwyr dyfeisiau cyffwrdd, archwilio drwy gyffwrdd â'r sgrin neu drwy sweipio.",
  tStatusQueryTooShort: (minQueryLength) =>
    `Ysgrifennwch ${minQueryLength} neu fwy o gymeriadau am ganlyniadau`,
  tNoResults: noResults
    ? () => noResults
    : () => "Dim canlyniadau wedi'u darganfod",
  tStatusNoResults: () => 'Dim canlyniadau chwilio',
  tStatusSelectedOption: (selectedOption, length, index) =>
    `Mae ${selectedOption} ${index + 1} o ${length} wedi'i amlygu`,
  tStatusResults: (length, contentSelectedOption) => {
    const resultOrResults = length === 1 ? 'canlyniad' : 'o ganlyniadau'
    return `${length} ${resultOrResults} ar gael. ${contentSelectedOption}`
  }
})

const enhancedInputFor = (autocompleteId) => {
  const enhanced = document.getElementById(autocompleteId)
  return enhanced?.tagName === 'SELECT' ? null : enhanced
}

const replaceSelectionWithOptionNamed = (
  selectElement,
  selectOptions,
  chosen
) => {
  selectElement.value = ''
  const selectedOption = selectOptions.find(
    (option) => (option.textContent || option.innerText) === chosen
  )
  if (selectedOption) {
    selectedOption.selected = true
  }
}

const announceChangeSince = (selectElement, valueBefore) => {
  if (selectElement.value !== valueBefore) {
    selectElement.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

const onConfirmFor =
  (selectElement, selectOptions, inputId) => (chosenOption) => {
    const valueBefore = selectElement.value
    const chosen = chosenOption ?? enhancedInputFor(inputId)?.value
    replaceSelectionWithOptionNamed(selectElement, selectOptions, chosen)
    announceChangeSince(selectElement, valueBefore)
  }

const buildConfig = (selectElement, selectOptions) => {
  const inputId = selectElement.id
  const { dataset } = selectElement
  const { noResults, placeholder } = dataset
  const { source, suggestionTemplate } = createSuggestionSearch(
    selectOptions
      .filter((option) => option.value)
      .map((option) => option.textContent)
  )
  const config = {
    selectElement,
    showAllValues: dataset.showAllValues === 'true',
    autoselect: dataset.autoSelect === 'true',
    defaultValue: dataset.defaultValue || '',
    minLength: dataset.minLength || undefined,
    source,
    templates: { suggestion: suggestionTemplate },
    onConfirm: onConfirmFor(selectElement, selectOptions, inputId)
  }
  if (placeholder) {
    config.placeholder = placeholder
  }
  if (noResults) {
    config.tNoResults = () => noResults
  }
  if (dataset.language === 'cy') {
    Object.assign(config, welshText(noResults))
  }
  return config
}

const linkAriaDescribedBy = (selectElement, autocompleteId) => {
  const describedBy = selectElement.getAttribute(ARIA_DESCRIBEDBY) || ''
  const enhanced = enhancedInputFor(autocompleteId)
  const enhancedDescribedBy = enhanced?.getAttribute(ARIA_DESCRIBEDBY) || ''
  if (enhanced && !enhancedDescribedBy.includes(describedBy)) {
    enhanced.setAttribute(
      ARIA_DESCRIBEDBY,
      `${describedBy} ${enhancedDescribedBy}`.trim()
    )
    selectElement.setAttribute(ARIA_DESCRIBEDBY, '')
  }
}

const addDecorativeSearchButton = (autocompleteId) => {
  const input = enhancedInputFor(autocompleteId)
  const container = input?.closest(`.${LIBRARY_WRAPPER_CLASS}`)?.parentElement
  if (!container) {
    return
  }
  const button = document.createElement('span')
  button.className = BUTTON_CLASS
  button.setAttribute('aria-hidden', 'true')
  button.addEventListener('click', () => input.focus())
  container.classList.add(CONTAINER_CLASS)
  container.append(button)
}

class AccessibleAutocomplete {
  static moduleName = 'app-accessible-autocomplete'

  constructor($module) {
    if ($module?.tagName !== 'SELECT') {
      return
    }
    const autocompleteId = $module.id
    accessibleAutocomplete.enhanceSelectElement(
      buildConfig($module, Array.from($module.options))
    )
    linkAriaDescribedBy($module, autocompleteId)
    addDecorativeSearchButton(autocompleteId)
  }
}

export default AccessibleAutocomplete
