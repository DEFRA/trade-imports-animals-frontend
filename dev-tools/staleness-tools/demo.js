import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const DEFAULT_TESTS_REPO = resolve(HERE, '../../../trade-imports-animals-tests')
const DEFAULT_FRONTEND_BASE_URL = 'http://localhost:3000'

const parseArgs = (argv) => {
  const args = { state: 'draft' }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    const value = argv[i + 1]
    if (flag === '--scenario') {
      args.scenario = value
      i += 1
      continue
    }
    if (flag === '--state') {
      args.state = value
      i += 1
      continue
    }
    throw new Error(`Unknown flag: ${flag}`)
  }
  if (!args.scenario) {
    throw new Error(
      '--scenario is required. Try --scenario country-stale|party-deleted|unknown-obligation.'
    )
  }
  return args
}

const runCapture = (label, cmd, cmdArgs, options = {}) => {
  const result = spawnSync(cmd, cmdArgs, { encoding: 'utf8', ...options })
  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? '')
    throw new Error(`${label} exited with code ${result.status}`)
  }
  return (result.stdout ?? '').trim()
}

const seedNotification = (state, testsRepoPath) =>
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

const applyScenario = (scenario, ref) => {
  const result = spawnSync(
    'node',
    [resolve(HERE, 'seed.js'), '--scenario', scenario, '--ref', ref],
    { stdio: 'inherit' }
  )
  if (result.status !== 0) {
    throw new Error(`seed:stale exited with code ${result.status}`)
  }
}

const main = () => {
  const args = parseArgs(process.argv.slice(2))
  const testsRepoPath =
    process.env.TRADE_IMPORTS_ANIMALS_TESTS_PATH ?? DEFAULT_TESTS_REPO
  const baseUrl =
    process.env.TRADE_IMPORTS_ANIMALS_FRONTEND_BASE_URL ??
    DEFAULT_FRONTEND_BASE_URL

  const ref = seedNotification(args.state, testsRepoPath)
  console.log(`Seeded ${args.state} notification: ${ref}`)
  applyScenario(args.scenario, ref)
  console.log(`\nOpen: ${baseUrl}/live-animals/notifications/${ref}`)
}

try {
  main()
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
}
