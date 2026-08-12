/*
 * Accessible autocomplete — progressive enhancement for a native <select>.
 *
 * Vendored and adapted from HMRC Frontend's accessible-autocomplete component:
 *   https://github.com/hmrc/hmrc-frontend
 *   src/components/accessible-autocomplete/accessible-autocomplete.js
 *   Pinned commit: 8aba9fc0b60a193d69fea0d3435a5b504cb922c4
 *
 * Copyright (c) 2018 HM Revenue & Customs
 * Licensed under the Apache License, Version 2.0. See NOTICE for details.
 *
 * Adaptations:
 *  - Enhances via the alphagov `accessible-autocomplete` package directly
 *    (import) rather than a `window.HMRCAccessibleAutocomplete` global.
 *  - govuk-frontend `createAll` compatible: a static `moduleName` plus
 *    constructor-time initialisation, so every
 *    `[data-module="app-accessible-autocomplete"]` <select> on the page is
 *    enhanced — the component is field-agnostic and reusable across pages.
 *  - A `data-no-results` attribute drives the "no results" message so each
 *    consumer supplies its own copy (in the correct language).
 */
import accessibleAutocomplete from 'accessible-autocomplete'

// Case-insensitive substring match over the option labels. Because each
// option label is "{name} ({code})", this filters by name or code.
const trimQuery = (values) => (query, syncResults) => {
  const needle = query.toLowerCase().trim()
  syncResults(
    values.filter((value) => value.toLowerCase().indexOf(needle) !== -1)
  )
}

class AccessibleAutocomplete {
  static moduleName = 'app-accessible-autocomplete'

  constructor($module) {
    if (!$module || $module.tagName !== 'SELECT') {
      return
    }

    const selectElement = $module
    const selectOptions = Array.from(selectElement.options)
    const autocompleteId = selectElement.id
    const language = selectElement.getAttribute('data-language') || 'en'
    const noResults = selectElement.getAttribute('data-no-results')

    const configurationOptions = {
      selectElement,
      showAllValues:
        selectElement.getAttribute('data-show-all-values') === 'true',
      autoselect: selectElement.getAttribute('data-auto-select') === 'true',
      defaultValue: selectElement.getAttribute('data-default-value') || '',
      minLength: selectElement.getAttribute('data-min-length') || undefined,
      // Only real options are searchable — placeholder/empty entries are dropped.
      source: trimQuery(
        selectOptions
          .filter((option) => option.value)
          .map((option) => option.textContent)
      ),
      onConfirm: (chosenOption) => {
        selectElement.value = ''
        const chosen =
          typeof chosenOption !== 'undefined'
            ? chosenOption
            : document.getElementById(autocompleteId)?.value
        const selectedOption = selectOptions.find(
          (option) => (option.textContent || option.innerText) === chosen
        )
        if (selectedOption) {
          selectedOption.selected = true
        }
      }
    }

    if (noResults) {
      configurationOptions.tNoResults = () => noResults
    }

    if (language === 'cy') {
      configurationOptions.tAssistiveHint = () =>
        "Pan fydd canlyniadau awtogwblhau ar gael, defnyddiwch y saethau i fyny ac i lawr i'w hadolygu a phwyswch y fysell 'enter' i'w dewis. Gall defnyddwyr dyfeisiau cyffwrdd, archwilio drwy gyffwrdd â'r sgrin neu drwy sweipio."
      configurationOptions.tStatusQueryTooShort = (minQueryLength) =>
        `Ysgrifennwch ${minQueryLength} neu fwy o gymeriadau am ganlyniadau`
      if (!noResults) {
        configurationOptions.tNoResults = () =>
          "Dim canlyniadau wedi'u darganfod"
      }
      configurationOptions.tStatusNoResults = () => 'Dim canlyniadau chwilio'
      configurationOptions.tStatusSelectedOption = (
        selectedOption,
        length,
        index
      ) => `Mae ${selectedOption} ${index + 1} o ${length} wedi'i amlygu`
      configurationOptions.tStatusResults = (length, contentSelectedOption) => {
        const resultOrResults = length === 1 ? 'canlyniad' : 'o ganlyniadau'
        return `${length} ${resultOrResults} ar gael. ${contentSelectedOption}`
      }
    }

    accessibleAutocomplete.enhanceSelectElement(configurationOptions)

    // Carry the select's aria-describedby (hint/error ids) onto the enhanced input.
    const describedBy = selectElement.getAttribute('aria-describedby') || ''
    const autocompleteElement = document.getElementById(autocompleteId)
    const enhancedDescribedBy =
      autocompleteElement?.getAttribute('aria-describedby') || ''
    const needsDescribedBy =
      autocompleteElement &&
      autocompleteElement.tagName !== 'SELECT' &&
      !enhancedDescribedBy.includes(describedBy)
    if (needsDescribedBy) {
      autocompleteElement.setAttribute(
        'aria-describedby',
        `${describedBy} ${enhancedDescribedBy}`.trim()
      )
      selectElement.setAttribute('aria-describedby', '')
    }
  }
}

export default AccessibleAutocomplete
