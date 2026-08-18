/**
 * Checks that the workspace backend is reachable before a workspace-backed E2E
 * run.
 *
 * Exit 1 means the stack is down.
 */
const backendUrl =
  process.env.TRADE_IMPORTS_ANIMALS_BACKEND_URL ?? 'http://localhost:8085'
const probeTimeoutMs = 5_000

// Any HTTP response means the backend is up — /notifications now requires owner
// headers and answers 400 without them (pr-005), which still proves reachability.
// Only a transport error (connection refused, timeout) means the stack is down.
const reachable = await fetch(`${backendUrl}/notifications`, {
  signal: AbortSignal.timeout(probeTimeoutMs)
})
  .then(() => true)
  .catch(() => false)

if (!reachable) {
  process.stderr.write(
    [
      '',
      `The E2E workspace stack check failed — ${backendUrl} did not answer.`,
      '',
      '  Start it:  scripts/stack/run-stack.sh   (from the trade-imports-animals workspace)',
      '',
      'Start the backend, Mongo and Redis before running workspace-backed E2E checks.',
      ''
    ].join('\n')
  )
  process.exit(1)
}
