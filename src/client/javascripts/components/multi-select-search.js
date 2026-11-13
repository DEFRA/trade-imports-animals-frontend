const RESULTS_SELECTOR = '[data-multi-select-search-results]'
const ENHANCED_CLASS = 'app-multi-select-search--enhanced'

const formBodyFor = (form, submitter) => {
  const body = new URLSearchParams(new FormData(form))
  if (submitter.name) {
    body.append(submitter.name, submitter.value)
  }
  return body
}

const resultsIn = (html) => {
  const template = document.createElement('template')
  template.innerHTML = html
  return template.content.querySelector(RESULTS_SELECTOR)
}

const fetchResults = async (url, body) => {
  try {
    const response = await fetch(url, { method: 'POST', body })
    return response.ok ? resultsIn(await response.text()) : null
  } catch {
    return null
  }
}

const focusReplacementOf = (trigger, searchBox) => {
  if (trigger.isConnected) {
    return
  }
  const replacement = trigger.id ? document.getElementById(trigger.id) : null
  ;(replacement ?? searchBox).focus()
}

const partsOf = ($module) => {
  const form = $module.closest('form')
  const results = $module.querySelector(RESULTS_SELECTOR)
  const status = $module.querySelector('[data-multi-select-search-status]')
  const searchBox =
    results && $module.querySelector(`[aria-controls="${results.id}"]`)
  const searchButton = searchBox
    ?.closest('.govuk-form-group')
    ?.querySelector('button')
  const { resultsUrl } = $module.dataset
  const parts = { form, results, status, searchBox, searchButton, resultsUrl }
  return Object.values(parts).every(Boolean) ? parts : null
}

const resultsRefresher = ({ form, results, status, searchBox, resultsUrl }) => {
  let refreshQueue = Promise.resolve()
  let refreshesWaiting = 0
  let submittingNatively = false

  const submitNatively = (submitter) => {
    let nativeSubmit
    const noteNativeSubmit = (event) => {
      nativeSubmit = event
    }
    submittingNatively = true
    form.addEventListener('submit', noteNativeSubmit, { once: true })
    form.requestSubmit(submitter)
    form.removeEventListener('submit', noteNativeSubmit)
    submittingNatively = nativeSubmit?.defaultPrevented === false
  }

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      submittingNatively = false
    }
  })

  const showResults = (fresh, { trigger, announce }) => {
    results.replaceChildren(...fresh.childNodes)
    focusReplacementOf(trigger, searchBox)
    if (announce) {
      status.textContent = fresh.dataset.announcement ?? ''
    }
  }

  const fetchAndShowResults = async (refreshRequest) => {
    if (submittingNatively) {
      return
    }
    const fresh = await fetchResults(
      resultsUrl,
      formBodyFor(form, refreshRequest.submitter)
    )
    if (fresh) {
      showResults(fresh, refreshRequest)
    } else {
      submitNatively(refreshRequest.submitter)
    }
  }

  return {
    isSubmittingNatively: () => submittingNatively,
    hasRefreshesWaiting: () => refreshesWaiting > 0,
    refresh: (refreshRequest) => {
      refreshesWaiting += 1
      refreshQueue = refreshQueue
        .then(() => fetchAndShowResults(refreshRequest))
        .catch(() => submitNatively(refreshRequest.submitter))
        .finally(() => {
          refreshesWaiting -= 1
        })
    },
    submitOnceRefreshesLand: (submitter) => {
      refreshQueue = refreshQueue.then(() => {
        if (!submittingNatively) {
          submitNatively(submitter)
        }
      })
    }
  }
}

const refreshOnEachChange = ($module, parts, refresher) => {
  const { form, results, searchBox, searchButton } = parts
  const typingDelayMs = 250
  let typingTimer

  const refreshNow = (refreshRequest) => {
    clearTimeout(typingTimer)
    refresher.refresh(refreshRequest)
  }

  searchBox.addEventListener('input', () => {
    clearTimeout(typingTimer)
    typingTimer = setTimeout(
      () =>
        refreshNow({
          submitter: searchButton,
          trigger: searchBox,
          announce: true
        }),
      typingDelayMs
    )
  })

  results.addEventListener('change', (event) =>
    refreshNow({
      submitter: searchButton,
      trigger: event.target,
      announce: false
    })
  )

  form.addEventListener('submit', (event) => {
    if (refresher.isSubmittingNatively()) {
      return
    }
    const { submitter } = event
    if (!submitter || !$module.contains(submitter)) {
      clearTimeout(typingTimer)
      if (refresher.hasRefreshesWaiting()) {
        event.preventDefault()
        refresher.submitOnceRefreshesLand(submitter)
      }
      return
    }
    event.preventDefault()
    refreshNow({
      submitter,
      trigger: submitter,
      announce: submitter === searchButton
    })
  })
}

const dropdownIn = (results) =>
  results.querySelector('[data-multi-select-search-dropdown]')

const showDropdown = (results) => {
  const dropdown = dropdownIn(results)
  if (dropdown) {
    dropdown.hidden = false
  }
}

const hideDropdown = (results) => {
  const dropdown = dropdownIn(results)
  if (dropdown) {
    dropdown.hidden = true
  }
}

const showDropdownOnFocusAndHideOnEscapeOrClickAway = (
  $module,
  { results, searchBox }
) => {
  searchBox.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      hideDropdown(results)
    }
  })
  searchBox.addEventListener('focus', () => showDropdown(results))
  searchBox.addEventListener('click', () => showDropdown(results))
  document.addEventListener('click', (event) => {
    if (!$module.contains(event.target)) {
      hideDropdown(results)
    }
  })
}

class MultiSelectSearch {
  static moduleName = 'app-multi-select-search'

  constructor($module) {
    const parts = $module ? partsOf($module) : null
    if (parts) {
      refreshOnEachChange($module, parts, resultsRefresher(parts))
      showDropdownOnFocusAndHideOnEscapeOrClickAway($module, parts)
      $module.classList.add(ENHANCED_CLASS)
    }
  }
}

export default MultiSelectSearch
