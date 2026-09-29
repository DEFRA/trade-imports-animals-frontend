// The scenarios read the obligations manifest and (for country-stale) the
// fulfilment registry, so the set must be booted before anything else runs.
import './boot-live-animals.js'
import { openNotifications } from './mongodb-client.js'
import * as scenarios from './stale-state-scenarios/index.js'

const parseArgs = (argv) => {
  const args = {}
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    if (flag === '--list') {
      args.list = true
      continue
    }
    const value = argv[i + 1]
    if (flag === '--scenario') {
      args.scenario = value
      i += 1
      continue
    }
    if (flag === '--ref') {
      args.ref = value
      i += 1
      continue
    }
    throw new Error(`Unknown flag: ${flag}`)
  }
  return args
}

const registry = () => Object.values(scenarios)

const printList = () => {
  for (const scenario of registry()) {
    console.log(`${scenario.id.padEnd(24)} ${scenario.summary}`)
  }
}

const applyScenario = async (id, ref) => {
  const scenario = registry().find((s) => s.id === id)
  if (!scenario) {
    throw new Error(`Unknown scenario '${id}'. Try --list.`)
  }
  if (!ref) {
    throw new Error('--ref is required')
  }
  const { notifications, close } = await openNotifications()
  try {
    await scenario.mutate(notifications, ref)
    console.log(`Applied ${scenario.id} to ${ref}.`)
  } finally {
    await close()
  }
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  if (args.list) {
    printList()
    return
  }
  await applyScenario(args.scenario, args.ref)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
