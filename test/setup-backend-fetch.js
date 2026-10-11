import { vi } from 'vitest'

// backendFetch sends through undici's own fetch with a connect-bounded agent.
// The unit suite mocks the global fetch (vitest-fetch-mock and plain stubs), so
// undici's fetch hands each call to whatever global fetch is in place, without
// the agent. backend-fetch.real.test.js covers the real path.
vi.mock('undici', async (importOriginal) => ({
  ...(await importOriginal()),
  fetch: (url, { dispatcher, ...init } = {}) => globalThis.fetch(url, init)
}))
