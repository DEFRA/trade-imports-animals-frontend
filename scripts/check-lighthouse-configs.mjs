import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const serverDir = path.join(projectRoot, 'src', 'server')
const lighthouseDir = path.join(projectRoot, 'tests', 'lighthouse')

// Routes to ignore when checking for Lighthouse coverage
const IGNORED_PATHS = new Set(['/health'])

// Naive but effective: looks for blocks like:
// { method: 'GET', path: '/origin', ... }
const GET_ROUTE_REGEX =
  /method:\s*'GET'[\s\S]*?path:\s*'([^']+)'/g

async function findServerPagePaths() {
  const entries = await readdir(serverDir, { withFileTypes: true })
  const indexFiles = entries
    .filter((e) => e.isDirectory())
    .map((dir) => path.join(serverDir, dir.name, 'index.js'))

  const paths = new Set()

  for (const file of indexFiles) {
    try {
      const content = await readFile(file, 'utf8')
      let match
      while ((match = GET_ROUTE_REGEX.exec(content)) !== null) {
        const routePath = match[1]
        if (!IGNORED_PATHS.has(routePath)) {
          paths.add(routePath)
        }
      }
    } catch {
      // ignore missing index.js
    }
  }

  return paths
}

async function findLighthouseConfigPaths() {
  const entries = await readdir(lighthouseDir, { withFileTypes: true })
  const configFiles = entries
    .filter(
      (e) => e.isFile() && e.name.endsWith('.config.js')
    )
    .map((e) => path.join(lighthouseDir, e.name))

  const paths = new Set()

  for (const file of configFiles) {
    const moduleUrl = pathToFileURL(file).href
    const module = await import(moduleUrl)

    // Support both single-config and multi-config exports
    Object.values(module).forEach((exported) => {
      if (exported && typeof exported === 'object' && exported.path) {
        paths.add(exported.path)
      }
    })
  }

  return paths
}

async function main() {
  const serverPaths = await findServerPagePaths()
  const configPaths = await findLighthouseConfigPaths()

  const missing = []
  for (const routePath of serverPaths) {
    if (!configPaths.has(routePath)) {
      missing.push(routePath)
    }
  }

  if (missing.length > 0) {
    console.error(
      '❌ Missing Lighthouse configs for the following page routes:'
    )
    missing.forEach((p) => console.error(`  - ${p}`))
    console.error(
      '\nFor each route above, add a Lighthouse config in tests/lighthouse/*.config.js and register it.'
    )
    process.exit(1)
  }

  console.log('✔ All page routes have corresponding Lighthouse configs.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

