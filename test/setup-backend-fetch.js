import { vi } from 'vitest'

// backendFetch sends through undici's own fetch with a connect-bounded agent,
// turning Node's FormData into undici's on the way. The unit suite mocks the
// global fetch (vitest-fetch-mock and plain stubs), so undici's fetch hands
// each call to whatever global fetch is in place, as the call was made: no
// agent, and Node's own FormData. backend-fetch.real.test.js covers the real
// path.
vi.mock('undici', async (importOriginal) => {
  const undici = await importOriginal()
  const asNodeFormData = (formData) => {
    const copy = new FormData()
    for (const [name, value] of formData) {
      copy.append(name, value)
    }
    return copy
  }
  const asCalled = ({ dispatcher, ...init } = {}) =>
    init.body instanceof undici.FormData
      ? { ...init, body: asNodeFormData(init.body) }
      : init
  return {
    ...undici,
    fetch: (url, init) => globalThis.fetch(url, asCalled(init))
  }
})
