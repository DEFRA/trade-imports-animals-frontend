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

const ARIA_DESCRIBEDBY = 'aria-describedby'

// Case-insensitive substring match over the option labels. Because each
// option label is "{name} ({code})", this filters by name or code.
const trimQuery = (values) => (query, syncResults) => {
  const needle = query.toLowerCase().trim()
  syncResults(values.filter((value) => value.toLowerCase().includes(needle)))
}

// Welsh screen-reader announcements (mirrors hmrc-frontend).
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

// Keep the selected option in sync with the enhanced input's chosen value.
// On a blur-confirm, accessible-autocomplete calls onConfirm() with no option,
// so fall back to the enhanced input's current value. `inputId` is the select's
// original id, which enhanceSelectElement moves onto that input (the select
// itself is renamed with a "-select" suffix); it is captured before enhancement.
const onConfirmFor =
  (selectElement, selectOptions, inputId) => (chosenOption) => {
    selectElement.value = ''
    const chosen =
      chosenOption !== undefined
        ? chosenOption
        : document.getElementById(inputId)?.value
    const selectedOption = selectOptions.find(
      (option) => (option.textContent || option.innerText) === chosen
    )
    if (selectedOption) {
      selectedOption.selected = true
    }
  }

// Build the enhanceSelectElement configuration from the select's data-* config.
const buildConfig = (selectElement, selectOptions) => {
  // Captured before enhanceSelectElement renames the select — this id ends up
  // on the enhanced input, which onConfirm reads on a blur-confirm.
  const inputId = selectElement.id
  const { dataset } = selectElement
  const { noResults } = dataset
  const config = {
    selectElement,
    showAllValues: dataset.showAllValues === 'true',
    autoselect: dataset.autoSelect === 'true',
    defaultValue: dataset.defaultValue || '',
    minLength: dataset.minLength || undefined,
    // Only real options are searchable — placeholder/empty entries are dropped.
    source: trimQuery(
      selectOptions
        .filter((option) => option.value)
        .map((option) => option.textContent)
    ),
    onConfirm: onConfirmFor(selectElement, selectOptions, inputId)
  }
  if (noResults) {
    config.tNoResults = () => noResults
  }
  if (dataset.language === 'cy') {
    Object.assign(config, welshText(noResults))
  }
  return config
}

// Carry the select's aria-describedby (hint/error ids) onto the enhanced input.
// enhanceSelectElement gives the input the select's original id, captured here
// before enhancement.
const linkAriaDescribedBy = (selectElement, autocompleteId) => {
  const describedBy = selectElement.getAttribute(ARIA_DESCRIBEDBY) || ''
  const enhanced = document.getElementById(autocompleteId)
  const enhancedDescribedBy = enhanced?.getAttribute(ARIA_DESCRIBEDBY) || ''
  const needsLink =
    enhanced &&
    enhanced.tagName !== 'SELECT' &&
    !enhancedDescribedBy.includes(describedBy)
  if (needsLink) {
    enhanced.setAttribute(
      ARIA_DESCRIBEDBY,
      `${describedBy} ${enhancedDescribedBy}`.trim()
    )
    selectElement.setAttribute(ARIA_DESCRIBEDBY, '')
  }
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
  }
}

export default AccessibleAutocomplete
