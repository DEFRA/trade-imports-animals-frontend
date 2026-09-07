import { sleep } from './retry.js'

const probe = async (url) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
    return response.ok
  } catch {
    return false
  }
}

/** Block until the workspace stack answers health checks. CI marks compose
 * services healthy before Lighthouse runs, but the seed still races occasional
 * read-after-write gaps — this catches the stack itself still starting. */
export const waitForStack = async ({
  frontendUrl = process.env.LIGHTHOUSE_BASE_URL ?? 'http://localhost:3000',
  backendUrl = process.env.TRADE_IMPORTS_ANIMALS_BACKEND_URL ??
    'http://localhost:8085',
  maxAttempts = 30,
  delayMs = 2000,
  settleMs = Number.parseInt(
    process.env.LIGHTHOUSE_STACK_SETTLE_MS ?? '2000',
    10
  )
} = {}) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const [frontendOk, backendOk] = await Promise.all([
      probe(`${frontendUrl}/health`),
      probe(`${backendUrl}/health`)
    ])
    if (frontendOk && backendOk) {
      if (settleMs > 0) {
        await sleep(settleMs)
      }
      return
    }
    if (attempt === maxAttempts) {
      throw new Error(
        `Lighthouse stack not ready after ${maxAttempts} attempts ` +
          `(frontend ${frontendOk ? 'ok' : 'down'}, backend ${backendOk ? 'ok' : 'down'})`
      )
    }
    await sleep(delayMs)
  }
}
