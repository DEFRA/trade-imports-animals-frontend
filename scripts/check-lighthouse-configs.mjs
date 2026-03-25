import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const lighthouseDir = path.join(projectRoot, 'tests', 'lighthouse')

// Routes to ignore when checking for Lighthouse coverage
const IGNORED_PATHS = new Set(['/health'])
const IGNORED_PREFIXES = ['/public/']
const IGNORED_ROUTE_PATTERNS = ['/public/{param*}', '/favicon.ico']

async function findFilesRecursively(dir, matcher) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await findFilesRecursively(fullPath, matcher)))
    } else if (entry.isFile() && matcher(entry.name)) {
      files.push(fullPath)
    }
  }

  return files
}

async function findServerPagePaths() {
  // Avoid auth bootstrap side-effects (OIDC discovery) while building route table.
  process.env.AUTH_ENABLED = 'false'
  const { createServer } = await import('../src/server/server.js')
  const server = await createServer()
  await server.initialize()
  const paths = new Set()
  for (const route of server.table()) {
    if (route.method !== 'get') {
      continue
    }
    if (IGNORED_PATHS.has(route.path)) {
      continue
    }
    if (IGNORED_ROUTE_PATTERNS.includes(route.path)) {
      continue
    }
    if (IGNORED_PREFIXES.some((prefix) => route.path.startsWith(prefix))) {
      continue
    }
    paths.add(route.path)
  }
  await server.stop({ timeout: 0 })

  return paths
}

async function findLighthouseConfigPaths() {
  const configFiles = await findFilesRecursively(
    lighthouseDir,
    (name) => name.endsWith('.config.js')
  )

  const paths = new Set()

  for (const file of configFiles) {
    const moduleUrl = pathToFileURL(file).href
    const module = await import(moduleUrl)

    // Support both single-config and multi-config exports
    Object.values(module).forEach((exported) => {
      if (exported && typeof exported === 'object' && exported.path) {
        paths.add(exported.path)
      }
      if (exported && typeof exported === 'object' && Array.isArray(exported.paths)) {
        exported.paths.forEach((routePath) => paths.add(routePath))
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

