import { load } from 'cheerio'

import {
  DEFAULT_DOCUMENT_RETRIES,
  documentRetryDelayMs,
  RETRYABLE_DOCUMENT_STATUSES,
  sleep
} from './retry.js'

const FORM_ENCODED = 'application/x-www-form-urlencoded'
const HTTP_OK = 200

const hiddenFormFields = ($) => {
  const fields = {}
  const concurrencyToken = $('input[name="concurrencyToken"]').attr('value')
  if (concurrencyToken) {
    fields.concurrencyToken = concurrencyToken
  }
  return fields
}

export const createJourneyClient = (
  baseUrl,
  cookies = [],
  { documentRetries = DEFAULT_DOCUMENT_RETRIES } = {}
) => {
  const jar = new Map(cookies.map(({ name, value }) => [name, value]))

  const cookieHeader = () =>
    [...jar].map(([name, value]) => `${name}=${value}`).join('; ')

  const remember = (response) => {
    for (const raw of response.headers.getSetCookie()) {
      const [pair] = raw.split(';')
      const separator = pair.indexOf('=')
      jar.set(pair.slice(0, separator), pair.slice(separator + 1))
    }
  }

  const request = async (path, init = {}) => {
    const response = await fetch(new URL(path, baseUrl), {
      ...init,
      redirect: 'manual',
      headers: { ...init.headers, cookie: cookieHeader() }
    })
    remember(response)
    return response
  }

  const documentOnce = async (path) => {
    const response = await request(path)
    const body = response.ok ? load(await response.text()) : load('')
    return {
      status: response.status,
      location: response.headers.get('location'),
      $: body,
      crumb: body('meta[name="csrf-token"]').attr('content') ?? '',
      heading: body('h1').first().text().trim()
    }
  }

  const document = async (path) => {
    let page = await documentOnce(path)
    for (let attempt = 0; attempt < documentRetries; attempt++) {
      if (
        page.status === HTTP_OK ||
        !RETRYABLE_DOCUMENT_STATUSES.has(page.status)
      ) {
        return page
      }
      await sleep(documentRetryDelayMs(attempt))
      page = await documentOnce(path)
    }
    return page
  }

  const submit = async (path, fields, crumb, page) => {
    const body = new URLSearchParams([['crumb', crumb]])
    if (page?.$) {
      for (const [name, value] of Object.entries(hiddenFormFields(page.$))) {
        body.append(name, value)
      }
    }
    for (const [name, value] of Object.entries(fields)) {
      for (const one of [value].flat()) {
        body.append(name, one)
      }
    }
    const response = await request(path, {
      method: 'POST',
      body: body.toString(),
      headers: { 'content-type': FORM_ENCODED }
    })
    return {
      status: response.status,
      location: response.headers.get('location')
    }
  }

  return { document, submit }
}
