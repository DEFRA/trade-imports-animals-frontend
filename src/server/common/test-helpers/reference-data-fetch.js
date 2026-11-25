import { vi } from 'vitest'

export const okResponse = (body) => ({ ok: true, json: async () => body })

export const stubFetch = (impl) => vi.stubGlobal('fetch', vi.fn(impl))

export const okOnlyForBlock = (block, body) => async (url) => {
  if (new URL(url).searchParams.get('blocks') !== block) {
    return { ok: false, status: 400, statusText: 'Unexpected countries query' }
  }
  return okResponse(body)
}
