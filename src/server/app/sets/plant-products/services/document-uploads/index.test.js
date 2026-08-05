import { afterEach, describe, expect, it, vi } from 'vitest'

const selectionUnder = async ({ plantMode, liveMode }) => {
  vi.stubEnv('PLANT_PRODUCTS_MODE', plantMode)
  vi.stubEnv('LIVE_ANIMALS_MODE', liveMode)
  vi.resetModules()
  const [selector, real, stub] = await Promise.all([
    import('./index.js'),
    import('../../../../services/document-uploads/real.js'),
    import('../../../../services/document-uploads/stub.js')
  ])
  return {
    selected: selector.documentUploads,
    real: real.documentUploads,
    stub: stub.documentUploads
  }
}

describe('plant-products document uploads adapter selection', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('selects the stub with PLANT_PRODUCTS_MODE=stub even while LIVE_ANIMALS_MODE=real', async () => {
    const { selected, stub } = await selectionUnder({
      plantMode: 'stub',
      liveMode: 'real'
    })

    expect(selected).toBe(stub)
  })

  it('selects the real adapter with PLANT_PRODUCTS_MODE=real even while LIVE_ANIMALS_MODE=stub', async () => {
    const { selected, real } = await selectionUnder({
      plantMode: 'real',
      liveMode: 'stub'
    })

    expect(selected).toBe(real)
  })

  it('defaults to the real adapter when neither mode is set', async () => {
    const { selected, real } = await selectionUnder({
      plantMode: undefined,
      liveMode: undefined
    })

    expect(selected).toBe(real)
  })
})
