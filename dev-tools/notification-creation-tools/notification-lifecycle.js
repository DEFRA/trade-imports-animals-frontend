// Shared helpers for the create.js and create-stale.js CLI entries.
// `assembleFulfilments` (inside completeDocuments) needs the set booted before
// it runs, so an entry importing this file must import ./boot-live-animals.js first.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { openNotifications } from './mongodb-client.js'
import { completeDocuments } from './complete-documents.js'

const HERE = dirname(fileURLToPath(import.meta.url))

export const DEFAULT_TESTS_REPO = resolve(
  HERE,
  '../../../trade-imports-animals-tests'
)
export const DEFAULT_FRONTEND_BASE_URL = 'http://localhost:3000'

const runCapture = (label, cmd, cmdArgs, options = {}) => {
  const result = spawnSync(cmd, cmdArgs, { encoding: 'utf8', ...options })
  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? '')
    throw new Error(`${label} exited with code ${result.status}`)
  }
  return (result.stdout ?? '').trim()
}

export const seedNotification = (state, testsRepoPath) =>
  runCapture('seed:notification', 'npm', [
    '--prefix',
    testsRepoPath,
    'run',
    '--silent',
    'seed:notification',
    '--',
    '--state',
    state
  ])

// SeededJourney deliberately skips documents (file upload can't be scripted
// via form POSTs), so a fresh notification always shows "Upload documents"
// incomplete. Write a minimal document fulfilment directly for demo purposes.
export const completeDocumentsSection = async (ref) => {
  const { notifications, close } = await openNotifications()
  try {
    await completeDocuments(notifications, ref)
  } finally {
    await close()
  }
}

export const applyScenario = (scenario, ref) => {
  const result = spawnSync(
    'node',
    [resolve(HERE, 'mutate-stale.js'), '--scenario', scenario, '--ref', ref],
    { stdio: 'inherit' }
  )
  if (result.status !== 0) {
    throw new Error(`mutate-stale exited with code ${result.status}`)
  }
}

export const openUrl = (baseUrl, ref) =>
  `${baseUrl}/live-animals/notifications/${ref}`

export const readEnv = () => ({
  testsRepoPath:
    process.env.TRADE_IMPORTS_ANIMALS_TESTS_PATH ?? DEFAULT_TESTS_REPO,
  baseUrl:
    process.env.TRADE_IMPORTS_ANIMALS_FRONTEND_BASE_URL ??
    DEFAULT_FRONTEND_BASE_URL
})
