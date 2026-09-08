import { load } from 'cheerio'

const FORM_ENCODED = 'application/x-www-form-urlencoded'

export const createJourneyClient = (baseUrl, cookies = []) => {
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

  const document = async (path) => {
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

  const submit = async (path, fields, crumb) => {
    const body = new URLSearchParams([['crumb', crumb]])
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
