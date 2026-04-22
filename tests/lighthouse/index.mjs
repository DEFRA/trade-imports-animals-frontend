import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

import { runLighthouse } from './run-lighthouse.js'
import { signinLighthouseConfig } from './signin.config.js'
import { signinOidcLighthouseConfig } from './signin-oidc.config.js'
import { signoutLighthouseConfig } from './signout.config.js'
import { authSignoutLighthouseConfig } from "./auth-signout.config.js"
import { signoutOidcLighthouseConfig } from './signout-oidc.config.js'
import { organisationLighthouseConfig } from './organisation.config.js'
import { originLighthouseConfig } from './origin.config.js'
import { aboutLighthouseConfig } from "./about.config.js"
import { homeLighthouseConfig } from "./home.config.js"
import { commoditiesLighthouseConfig } from "./commodities.config.js"
import { commoditiesSelectLighthouseConfig } from './commodities-select.config.js'
import {importReasonLighthouseConfig} from "./import-reason.config.js";
import {commodityDetailsLighthouseConfig} from "./commodities-details.config.js";
import {additionalDetailsLighthouseConfig} from "./additional-details.config.js";
import { animalsIdentificationDetailsLighthouseConfig } from "./animals-identification-details.config.js";
import { addressesLighthouseConfig } from './addresses.config.js'
import { consignorSelectLighthouseConfig } from './consignor-select.config.js'
import { cphNumberLighthouseConfig } from './cph-number.config.js'

const pageConfigs = [
  signinLighthouseConfig,
  signinOidcLighthouseConfig,
  signoutLighthouseConfig,
  signoutOidcLighthouseConfig,
  authSignoutLighthouseConfig,
  organisationLighthouseConfig,
  homeLighthouseConfig,
  aboutLighthouseConfig,
  originLighthouseConfig,
  commoditiesLighthouseConfig,
  commoditiesSelectLighthouseConfig,
  importReasonLighthouseConfig,
  commodityDetailsLighthouseConfig,
  additionalDetailsLighthouseConfig,
  animalsIdentificationDetailsLighthouseConfig,
  addressesLighthouseConfig,
  consignorSelectLighthouseConfig,
  cphNumberLighthouseConfig
]

const baseUrl = process.env.LH_BASE_URL || 'http://localhost:3000'
const reportsDir = process.env.LH_REPORT_DIR || 'lighthouse-reports'

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

  // Write full JSON report per preset
  const fileSafeName = variant.name + '_' + variant.preset
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\\-]/g, '')
  await mkdir(reportsDir, { recursive: true })
  const reportPath = path.join(reportsDir, `${fileSafeName}.json`)
  await writeFile(reportPath, JSON.stringify(lhr, null, 2), 'utf8')

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
  console.log(`\n=== [✔] Lighthouse results for the page: ${variant.name} ===`)
  console.log(`URL: ${url}`)
  console.log(`Preset: ${variant.preset}`)
  console.log(
    `Scores → performance: ${results.performance}, ` +
    `accessibility: ${results.accessibility}, ` +
    `bestPractices: ${results.bestPractices}`
  )
  console.log(`\nReport saved to → ${reportPath}`)
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
