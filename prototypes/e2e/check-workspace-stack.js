/**
 * Gate for the prototype E2E suites (`npm run test:prototype*`).
 *
 * The `parity` project drives a REAL-mode server, which persists through the
 * workspace stack — the backend on :8085, Mongo behind it, and Redis for the
 * session cache. With the stack down that server never becomes ready, and
 * Playwright's only signal is a 180-second web-server timeout followed by a wall
 * of connection noise. Probe the backend first and say what to do instead.
 *
 * Runs before Playwright, from the `test:prototype*` scripts. Exit 1 = stack
 * down.
 */
const backendUrl =
  process.env.TRADE_IMPORTS_ANIMALS_BACKEND_URL ?? 'http://localhost:8085'
const probeTimeoutMs = 5_000

const reachable = await fetch(`${backendUrl}/notifications`, {
  signal: AbortSignal.timeout(probeTimeoutMs)
})
  .then((response) => response.ok)
  .catch(() => false)

if (!reachable) {
  process.stderr.write(
    [
      '',
      `The prototype E2E suite needs the workspace stack — ${backendUrl} did not answer.`,
      '',
      '  Start it:  scripts/stack/run-stack.sh   (from the trade-imports-animals workspace)',
      '',
      "The 'parity' project drives a real-mode server that persists through the backend,",
      'Mongo and Redis. Without the stack that server never boots, and the run would die',
      'in a 180-second web-server timeout instead of this message.',
      ''
    ].join('\n')
  )
  process.exit(1)
}
