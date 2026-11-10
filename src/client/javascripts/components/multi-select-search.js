const RESULTS_SELECTOR = '[data-multi-select-search-results]'

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

class MultiSelectSearch {
  static moduleName = 'app-multi-select-search'

  constructor($module) {
    const parts = $module ? partsOf($module) : null
    if (!parts) {
      return
    }
    const { form, results, status, searchBox, searchButton, resultsUrl } = parts
    const typingDelayMs = 250
    let refreshQueue = Promise.resolve()
    let refreshesWaiting = 0
    let typingTimer
    let submittingNatively = false

    const submitNatively = (submitter) => {
      submittingNatively = true
      form.requestSubmit(submitter)
    }

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

    const refresh = (refreshRequest) => {
      clearTimeout(typingTimer)
      refreshesWaiting += 1
      refreshQueue = refreshQueue
        .then(() => fetchAndShowResults(refreshRequest))
        .finally(() => {
          refreshesWaiting -= 1
        })
      return refreshQueue
    }

    const submitOnceRefreshesLand = (submitter) =>
      refreshQueue.then(() => {
        if (!submittingNatively) {
          submitNatively(submitter)
        }
      })

    searchBox.addEventListener('input', () => {
      clearTimeout(typingTimer)
      typingTimer = setTimeout(
        () =>
          refresh({
            submitter: searchButton,
            trigger: searchBox,
            announce: true
          }),
        typingDelayMs
      )
    })

    results.addEventListener('change', (event) =>
      refresh({
        submitter: searchButton,
        trigger: event.target,
        announce: false
      })
    )

    form.addEventListener('submit', (event) => {
      if (submittingNatively) {
        return
      }
      const { submitter } = event
      if (!submitter || !$module.contains(submitter)) {
        clearTimeout(typingTimer)
        if (refreshesWaiting > 0) {
          event.preventDefault()
          submitOnceRefreshesLand(submitter)
        }
        return
      }
      event.preventDefault()
      refresh({
        submitter,
        trigger: submitter,
        announce: submitter === searchButton
      })
    })
  }
}

export default MultiSelectSearch
