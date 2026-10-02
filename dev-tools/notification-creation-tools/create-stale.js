// completeDocuments (in notification-lifecycle) calls assembleFulfilments,
// which needs the set booted before it runs.
import './boot-live-animals.js'
import {
  applyScenario,
  completeDocumentsSection,
  openUrl,
  readEnv,
  seedNotification
} from './notification-lifecycle.js'

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
      '--scenario is required. Try --scenario country-stale|unknown-obligation.'
    )
  }
  return args
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  const { testsRepoPath, baseUrl } = readEnv()

  const ref = seedNotification(args.state, testsRepoPath)
  console.log(`Seeded ${args.state} notification: ${ref}`)
  await completeDocumentsSection(ref)
  applyScenario(args.scenario, ref)
  console.log(`\nOpen: ${openUrl(baseUrl, ref)}`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
