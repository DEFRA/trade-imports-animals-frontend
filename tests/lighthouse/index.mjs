import { runLighthouse } from './run-lighthouse.js'
import { originLighthouseConfig } from './origin.config.js'

const pageConfigs = [
  originLighthouseConfig
]

const baseUrl = process.env.LH_BASE_URL || 'http://localhost:3000'
async function runVariant(basePath, variant) {
  const url = `${baseUrl}${basePath}`
  const lhr = await runLighthouse(url, { preset: variant.preset })
  const { performance, accessibility } = lhr.categories
  const bestPractices = lhr.categories['best-practices']
  const results = {
    performance: performance.score,
    accessibility: accessibility.score,
    bestPractices: bestPractices.score
  }
  // Threshold checks
  for (const [key, min] of Object.entries(variant.name)) {
    const actual = results[key]
    if (actual < min) {
      throw new Error(
        `[${variant.name}] Lighthouse ${key} score ${actual} below threshold ${min} for ${url}`
      )
    }
  }
  // Separate, labeled output per preset
  console.log(`\n=== [✔] Lighthouse results: ${variant.name} ===`)
  console.log(`URL: ${url}`)
  console.log(`Preset: ${variant.preset}`)
  console.log(
    `Scores → performance: ${results.performance}, ` +
    `accessibility: ${results.accessibility}, ` +
    `bestPractices: ${results.bestPractices}`
  )
}
async function main() {
  for (const pageConfig of pageConfigs) {
    for (const variant of pageConfig.variants) {
      await runVariant(pageConfig.path, variant)
    }
  }
}
main().catch((err) => {
  console.error(err)
  process.exit(1)
})
