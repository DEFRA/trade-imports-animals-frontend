// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAll } from 'govuk-frontend'
import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'
import MultiSelectSearch from './multi-select-search.js'

const RESULTS_URL = '/notifications/abc/things/results'

const environment = nunjucksConfig.options.compileOptions.environment

const resultsBodyHtml = ({ ticked = false, chosen = [] } = {}) => `
  <div class="govuk-checkboxes" data-multi-select-search-dropdown>
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

const nativeSubmitsOf = (form, record = (event) => event.submitter) => {
  const nativeSubmits = []
  form.addEventListener('submit', (event) => {
    if (!event.defaultPrevented) {
      nativeSubmits.push(record(event))
      event.preventDefault()
    }
  })
  return nativeSubmits
}

const dropdownOf = (results) =>
  results().querySelector('[data-multi-select-search-dropdown]')

const heldResponse = () => {
  const { promise, resolve } = Promise.withResolvers()
  return { promise, answer: resolve }
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

  it('Should mark the search as enhanced, so controls only needed without JavaScript can hide', () => {
    mount()

    expect(
      document
        .querySelector('[data-module="app-multi-select-search"]')
        .classList.contains('app-multi-select-search--enhanced')
    ).toBe(true)
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
    const nativeSubmits = nativeSubmitsOf(form)

    results().querySelector('button[value="remove:a"]').click()
    await settle()

    expect(postedBody(fetchMock.mock.calls[0]).getAll('action')).toEqual([
      'remove:a'
    ])
    expect(nativeSubmits).toEqual([])
    expect(results().querySelector('button[value="remove:a"]')).toBeNull()
    expect(document.activeElement).toBe(searchBox)
  })

  it('Should run the search when Search is pressed, without leaving the page', async () => {
    const { form, searchBox, searchButton, status } = mount('')
    fetchMock.mockResolvedValue(
      answering(responseHtml('1 result available', resultsBodyHtml()))
    )
    const nativeSubmits = nativeSubmitsOf(form)

    searchBox.value = 'thing'
    searchButton.click()
    await settle()

    expect(postedBody(fetchMock.mock.calls[0]).get('q')).toBe('thing')
    expect(nativeSubmits).toEqual([])
    expect(status.textContent).toBe('1 result available')
  })

  it('Should send a search pressed while Clear all is refreshing only once it lands, from the form it left', async () => {
    const { searchBox, searchButton, results } = mount(
      resultsBodyHtml({ ticked: true, chosen: ['a'] })
    )
    const clear = heldResponse()
    fetchMock
      .mockReturnValueOnce(clear.promise)
      .mockResolvedValueOnce(
        answering(responseHtml('', '<p id="searched">Searched</p>'))
      )

    results().querySelector('button[value="clear"]').click()
    searchBox.value = 'other'
    searchButton.click()
    await settle()
    expect(fetchMock).toHaveBeenCalledOnce()

    clear.answer(answering(responseHtml('', resultsBodyHtml())))
    await settle()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const searchBody = postedBody(fetchMock.mock.calls[1])
    expect(searchBody.getAll('chosen')).toEqual([])
    expect(searchBody.get('q')).toBe('other')
    expect(results().querySelector('#searched')).not.toBeNull()
  })

  it('Should submit the form itself with the pressed action when the results request fails', async () => {
    const { form, searchBox, searchButton } = mount('')
    fetchMock.mockResolvedValue({ ok: false, text: async () => '' })
    const nativeSubmitters = nativeSubmitsOf(form)

    searchBox.value = 'thing'
    searchButton.click()
    await settle()

    expect(nativeSubmitters).toEqual([searchButton])
  })

  it('Should refresh in place again after its own submit of the form is cancelled', async () => {
    const { form, results } = mount()
    fetchMock
      .mockResolvedValueOnce({ ok: false, text: async () => '' })
      .mockResolvedValueOnce(
        answering(responseHtml('', '<p id="refreshed">Refreshed</p>'))
      )
    nativeSubmitsOf(form)

    results().querySelector('#thing-a').click()
    await settle()
    results().querySelector('#thing-a').click()
    await settle()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(results().querySelector('#refreshed')).not.toBeNull()
  })

  it('Should refresh in place again when the page it submitted away from is restored from the back-forward cache', async () => {
    const { results } = mount()
    fetchMock
      .mockResolvedValueOnce({ ok: false, text: async () => '' })
      .mockResolvedValueOnce(
        answering(responseHtml('', '<p id="refreshed">Refreshed</p>'))
      )

    results().querySelector('#thing-a').click()
    await settle()
    const restored = new Event('pageshow')
    Object.defineProperty(restored, 'persisted', { value: true })
    window.dispatchEvent(restored)
    results().querySelector('#thing-a').click()
    await settle()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(results().querySelector('#refreshed')).not.toBeNull()
  })

  it('Should hold a save pressed while results are refreshing until they land, then submit it with the refreshed form', async () => {
    const { form, results, saveButton } = mount(
      resultsBodyHtml({ ticked: true, chosen: ['a'] })
    )
    const refresh = heldResponse()
    fetchMock.mockReturnValueOnce(refresh.promise)
    const nativeSubmits = nativeSubmitsOf(form, (event) => ({
      submitter: event.submitter,
      chosen: new FormData(form).getAll('chosen')
    }))

    results().querySelector('button[value="clear"]').click()
    saveButton.click()
    await settle()
    expect(nativeSubmits).toEqual([])

    refresh.answer(answering(responseHtml('', resultsBodyHtml())))
    await settle()
    expect(nativeSubmits).toEqual([{ submitter: saveButton, chosen: [] }])
  })

  it('Should hide the results on Escape in the search box, keeping the term, and show them again when the box is focused', () => {
    const { searchBox, results } = mount()
    searchBox.value = 'thing'

    const escape = new globalThis.KeyboardEvent('keydown', {
      key: 'Escape',
      cancelable: true
    })
    searchBox.dispatchEvent(escape)

    expect(dropdownOf(results).hidden).toBe(true)
    expect(escape.defaultPrevented).toBe(true)
    expect(searchBox.value).toBe('thing')

    searchBox.dispatchEvent(new Event('focus'))
    expect(dropdownOf(results).hidden).toBe(false)
  })

  it('Should hide the results only once a click outside the search has landed, and keep them for a click inside it', () => {
    const { results, saveButton } = mount()
    const outside = document.createElement('p')
    document.body.append(outside)

    results()
      .querySelector('#thing-a')
      .dispatchEvent(new Event('click', { bubbles: true }))
    expect(dropdownOf(results).hidden).toBe(false)

    saveButton.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(dropdownOf(results).hidden).toBe(false)

    outside.click()
    expect(dropdownOf(results).hidden).toBe(true)
  })

  it('Should leave a save outside the search to submit the form, and post nothing for it', async () => {
    const { form, saveButton } = mount()
    const nativeSubmitters = nativeSubmitsOf(form)

    saveButton.click()
    await settle()

    expect(nativeSubmitters).toEqual([saveButton])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
