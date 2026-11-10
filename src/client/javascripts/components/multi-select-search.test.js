// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAll } from 'govuk-frontend'
import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'
import MultiSelectSearch from './multi-select-search.js'

const RESULTS_URL = '/notifications/abc/things/results'

const environment = nunjucksConfig.options.compileOptions.environment

const resultsBodyHtml = ({ ticked = false, chosen = [] } = {}) => `
  <div class="govuk-checkboxes">
    <input class="govuk-checkboxes__input" id="thing-a" name="thing" type="checkbox" value="a"${ticked ? ' checked' : ''}>
    <label for="thing-a">Thing A</label>
  </div>
  ${chosen
    .map(
      (value) =>
        `<input type="hidden" name="chosen" value="${value}"><button type="submit" name="action" value="remove:${value}">Remove ${value}</button>`
    )
    .join('')}
  <button type="submit" name="action" value="clear">Clear all</button>
`

const pageHtml = (resultsHtml) =>
  environment.renderString(
    `{% from "multi-select-search/macro.njk" import appMultiSelectSearch %}
    <form method="post">
      <input type="hidden" name="crumb" value="token">
      {% call appMultiSelectSearch({
        search: { id: "q", name: "q", value: "", label: { text: "Search for a thing" },
                  button: { text: "Search" } },
        resultsId: "q-results",
        resultsUrl: resultsUrl
      }) %}{{ resultsHtml | safe }}{% endcall %}
      <button type="submit" name="saveChoice" value="continue">Save and continue</button>
    </form>`,
    { resultsUrl: RESULTS_URL, resultsHtml }
  )

const responseHtml = (announcement, resultsHtml) =>
  environment.renderString(
    `{% from "multi-select-search/macro.njk" import appMultiSelectSearchResults %}
    {% call appMultiSelectSearchResults({ announcement: announcement }) %}{{ resultsHtml | safe }}{% endcall %}`,
    { announcement, resultsHtml }
  )

const answering = (html) => ({ ok: true, text: async () => html })

const mount = (resultsHtml = resultsBodyHtml()) => {
  document.body.innerHTML = pageHtml(resultsHtml)
  document.body.classList.add('govuk-frontend-supported')
  createAll(MultiSelectSearch, undefined, { scope: document.body })
  return {
    form: document.querySelector('form'),
    searchBox: document.getElementById('q'),
    searchButton: document.querySelector('button[value="search"]'),
    results: () => document.getElementById('q-results'),
    status: document.querySelector('[data-multi-select-search-status]'),
    saveButton: document.querySelector('button[name="saveChoice"]')
  }
}

const postedBody = (call) => new URLSearchParams(call[1].body.toString())

const settle = () => vi.runAllTimersAsync()

describe('#MultiSelectSearch', () => {
  let fetchMock

  beforeEach(() => {
    vi.useFakeTimers()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('Should post the form with the search action once typing pauses, then show the results and announce them', async () => {
    fetchMock.mockResolvedValue(
      answering(responseHtml('1 result available', resultsBodyHtml()))
    )
    const { searchBox, results, status } = mount('')

    searchBox.value = 'thi'
    searchBox.dispatchEvent(new Event('input'))
    expect(fetchMock).not.toHaveBeenCalled()
    await settle()

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe(RESULTS_URL)
    expect(options.method).toBe('POST')
    expect(Object.fromEntries(postedBody(fetchMock.mock.calls[0]))).toEqual({
      crumb: 'token',
      q: 'thi',
      action: 'search'
    })
    expect(results().querySelector('#thing-a')).not.toBeNull()
    expect(status.textContent).toBe('1 result available')
  })

  it('Should refresh the results when a result is ticked, keep focus on the ticked box and announce nothing', async () => {
    const { results, status } = mount()
    fetchMock.mockResolvedValue(
      answering(
        responseHtml(
          '1 result available',
          resultsBodyHtml({ ticked: true, chosen: ['a'] })
        )
      )
    )

    const box = results().querySelector('#thing-a')
    box.focus()
    box.click()
    await settle()

    expect(postedBody(fetchMock.mock.calls[0]).getAll('thing')).toEqual(['a'])
    expect(postedBody(fetchMock.mock.calls[0]).get('action')).toBe('search')
    expect(results().querySelector('button[value="remove:a"]')).not.toBeNull()
    expect(document.activeElement).toBe(results().querySelector('#thing-a'))
    expect(document.activeElement).not.toBe(box)
    expect(status.textContent).toBe('')
  })

  it('Should post the pressed Remove as the action, refresh in place and move focus to the search box', async () => {
    const { form, searchBox, results } = mount(
      resultsBodyHtml({ ticked: true, chosen: ['a'] })
    )
    fetchMock.mockResolvedValue(answering(responseHtml('', resultsBodyHtml())))
    const navigated = vi.fn()
    form.addEventListener('submit', (event) => {
      if (!event.defaultPrevented) {
        navigated()
        event.preventDefault()
      }
    })

    results().querySelector('button[value="remove:a"]').click()
    await settle()

    expect(postedBody(fetchMock.mock.calls[0]).getAll('action')).toEqual([
      'remove:a'
    ])
    expect(navigated).not.toHaveBeenCalled()
    expect(results().querySelector('button[value="remove:a"]')).toBeNull()
    expect(document.activeElement).toBe(searchBox)
  })

  it('Should run the search when Search is pressed, without leaving the page', async () => {
    const { searchBox, searchButton, status } = mount('')
    fetchMock.mockResolvedValue(
      answering(responseHtml('1 result available', resultsBodyHtml()))
    )

    searchBox.value = 'thing'
    searchButton.click()
    await settle()

    expect(postedBody(fetchMock.mock.calls[0]).get('q')).toBe('thing')
    expect(status.textContent).toBe('1 result available')
  })

  it('Should show only the latest results when an earlier request answers last', async () => {
    const { searchBox, searchButton, results } = mount('')
    let answerEarlier
    fetchMock
      .mockReturnValueOnce(
        new Promise((resolve) => {
          answerEarlier = resolve
        })
      )
      .mockResolvedValueOnce(
        answering(responseHtml('later', '<p id="later">Later</p>'))
      )

    searchBox.value = 'ear'
    searchButton.click()
    searchBox.value = 'later'
    searchButton.click()
    await settle()
    answerEarlier(answering(responseHtml('earlier', '<p id="earlier">E</p>')))
    await settle()

    expect(results().querySelector('#later')).not.toBeNull()
    expect(results().querySelector('#earlier')).toBeNull()
  })

  it('Should submit the form itself with the pressed action when the results request fails', async () => {
    const { form, searchBox, searchButton } = mount('')
    fetchMock.mockResolvedValue({ ok: false, text: async () => '' })
    const nativeSubmitters = []
    form.addEventListener('submit', (event) => {
      if (!event.defaultPrevented) {
        nativeSubmitters.push(event.submitter)
        event.preventDefault()
      }
    })

    searchBox.value = 'thing'
    searchButton.click()
    await settle()

    expect(nativeSubmitters).toEqual([searchButton])
  })

  it('Should hold a save pressed while results are refreshing until they land, then submit it with the refreshed form', async () => {
    const { form, results, saveButton } = mount(
      resultsBodyHtml({ ticked: true, chosen: ['a'] })
    )
    let answerRefresh
    fetchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        answerRefresh = resolve
      })
    )
    const nativeSubmits = []
    form.addEventListener('submit', (event) => {
      if (!event.defaultPrevented) {
        nativeSubmits.push({
          submitter: event.submitter,
          chosen: new FormData(form).getAll('chosen')
        })
        event.preventDefault()
      }
    })

    results().querySelector('button[value="clear"]').click()
    saveButton.click()
    await settle()
    expect(nativeSubmits).toEqual([])

    answerRefresh(answering(responseHtml('', resultsBodyHtml())))
    await settle()
    expect(nativeSubmits).toEqual([{ submitter: saveButton, chosen: [] }])
  })

  it('Should leave a save outside the search to submit the form, and post nothing for it', async () => {
    const { form, saveButton } = mount()
    const nativeSubmitters = []
    form.addEventListener('submit', (event) => {
      if (!event.defaultPrevented) {
        nativeSubmitters.push(event.submitter)
        event.preventDefault()
      }
    })

    saveButton.click()
    await settle()

    expect(nativeSubmitters).toEqual([saveButton])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
